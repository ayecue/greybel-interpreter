import { ContextType, OperationContext } from "./context";
import { ContextTypeIntrinsics } from "./context/types";
import { HandlerContainer } from "./handler-container";
import { CustomValue } from "./types/base";
import { CallInstruction, CallInternalInstruction, ConstructListInstruction, ConstructMapInstruction, FunctionDefinitionInstruction, GetPropertyInstruction, GetVariableInstruction, GotoAInstruction, ImportInstruction, Instruction, NextInstruction, OpCode, PushInstruction, SourceLocation } from "./byte-compiler/instruction";
import { DefaultType } from "./types/default";
import { Stack } from "./utils/stack";
import { RuntimeError } from "./utils/error";
import { CustomValueWithIntrinsics } from "./types/with-intrinsics";
import { CustomBoolean } from "./types/boolean";
import { CustomFunction } from "./types/function";
import { absClamp01, evalAdd, evalAnd, evalBitwiseAnd, evalBitwiseLeftShift, evalBitwiseOr, evalBitwiseRightShift, evalBitwiseUnsignedRightShift, evalDiv, evalEqual, evalGreaterThan, evalGreaterThanOrEqual, evalLessThan, evalLessThanOrEqual, evalMod, evalMul, evalNotEqual, evalOr, evalPow, evalSub } from "./vm/evaluation";
import { CustomNumber } from "./types/number";
import { CustomMap } from "./types/map";
import { CustomList } from "./types/list";
import { setImmediate } from "./utils/set-immediate";
import { CustomString } from "./types/string";
import EventEmitter from "events";
import { ObjectValue } from "./utils/object-value";

export class Debugger {
  private breakpoint: boolean = false;
  private nextStep: boolean = false;
  private vm: VM;

  debug(...segments: any[]): CustomValue {
    console.debug(...segments);
    return DefaultType.Void;
  }

  setBreakpoint(breakpoint: boolean): Debugger {
    this.breakpoint = breakpoint;
    return this;
  }

  getBreakpoint(vm: VM): boolean {
    return this.breakpoint;
  }

  next(): Debugger {
    this.nextStep = true;
    return this;
  }

  resume(): Promise<void> {
    if (!this.breakpoint) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      const check = () => {
        if (!this.breakpoint) {
          resolve();
        } else if (this.nextStep) {
          this.nextStep = false;
          resolve();
        } else {
          setImmediate(check);
        }
      };

      check();
    });
  }

  interact(vm: VM, _source: SourceLocation) {
    const me = this;
    console.warn('Debugger is not setup.');
    console.info(vm);
    me.breakpoint = false;
  }
}

export interface FrameOptions {
  code: Instruction[];
  self?: CustomValue;
  super?: CustomValue;
  outer?: OperationContext;
}

export enum VMState {
  PREPARATION,
  PENDING,
  FINISHED,
  STOPPED
}

export interface VMOptions {
  target: string;
  contextTypeIntrinsics: ContextTypeIntrinsics;
  globals: OperationContext;
  handler: HandlerContainer;
  debugger: Debugger;
  environmentVariables?: Map<string, string>;
  imports?: Map<string, Instruction[]>;
  externalFrames?: Stack<OperationContext>;
  maxActionsPerLoop?: number;
}

type VMResumeCallback = (err?: any) => void;

export class VM {
  private readonly ACTIONS_PER_LOOP: number = 80000;
  private maxActionsPerLoop: number;
  private actionCount: number;

  private state: VMState;
  private frames: Stack<OperationContext>;
  private signal: EventEmitter;

  private readonly STACK_LIMIT: number = 512;
  private sp: number;
  private stack: CustomValue[] = new Array(this.STACK_LIMIT);
  private iterators: Stack<Iterator<CustomValue> & { index: number }>;
  private time: number;

  readonly target: string;
  readonly contextTypeIntrinsics: ContextTypeIntrinsics;
  readonly environmentVariables: Map<string, string>;
  readonly handler: HandlerContainer;
  readonly debugger: Debugger;
  readonly imports: Map<string, Instruction[]>;
  readonly externalFrames: Stack<OperationContext>;

  constructor(options: VMOptions) {
    this.signal = new EventEmitter();
    this.state = VMState.PREPARATION;
    this.maxActionsPerLoop = options.maxActionsPerLoop ?? this.ACTIONS_PER_LOOP;
    this.actionCount = 0;
    this.sp = 0;
    this.time = -1;
    this.target = options.target;
    this.frames = new Stack(options.globals);
    this.contextTypeIntrinsics = options.contextTypeIntrinsics;
    this.handler = options.handler;
    this.debugger = options.debugger;
    this.environmentVariables = options.environmentVariables ?? new Map();
    this.iterators = new Stack();
    this.imports = options.imports ?? new Map();
    this.externalFrames = options.externalFrames ?? new Stack();
  }

  getTime(): number {
    return this.time;
  }

  isPending(): boolean {
    return this.state === VMState.PENDING;
  }

  getStacktrace(): Instruction[] {
    const externalFrames = this.externalFrames.values();
    const frames = this.frames.values();
    const stacktrace: Instruction[] = [];

    for (let index = 0; index < externalFrames.length; index++) {
      stacktrace.push(externalFrames[index].getCurrentInstruction());
    }

    for (let index = 0; index < frames.length; index++) {
      stacktrace.unshift(frames[index].getCurrentInstruction());
    }

    return stacktrace;
  }

  setMaxActionsPerLoop(actions: number) {
    this.maxActionsPerLoop = actions;
    return this
  }

  getOpenHandles(): number {
    return this.sp;
  }

  getSignal(): EventEmitter {
    return this.signal;
  }

  exit() {
    this.state = VMState.STOPPED;
    this.signal.emit('exit');
  }

  getFrame(): OperationContext {
    return this.frames.peek();
  }

  getFrames(): Stack<OperationContext> {
    return this.frames;
  }

  private pushStack(value: CustomValue) {
    this.stack[this.sp++] = value;
  }

  private popStack() {
    return this.stack[--this.sp];
  }

  private createFrame(options: FrameOptions): OperationContext {
    this.getFrame().ip--;
    const ctx = this.getFrame().fork({
      code: options.code,
      type: ContextType.Function,
      self: options.self,
      super: options.super,
      outer: options.outer
    });

    this.frames.push(ctx);
    return ctx;
  }

  private popFrame(): OperationContext {
    if (this.frames.length === 1) {
      return null;
    }

    const frame = this.frames.pop();
    this.getFrame().ip++;
    return frame;
  }

  async exec(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.state = VMState.PENDING;
      this.time = Date.now();

      this.resume((err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  }

  private resume(done: VMResumeCallback) {
    try {
      while (true) {
        if (!this.isPending()) {
          done();
          return;
        }

        const frame = this.getFrame();

        if (frame.code.length === frame.ip) {
          this.popFrame();
          continue;
        }

        const instruction = frame.code[frame.ip++];

        switch (instruction.op) {
          case OpCode.NOOP: {
            break;
          }
          case OpCode.PUSH: {
            const pushInstruction = instruction as PushInstruction;
            this.pushStack(pushInstruction.value);
            break;
          }
          case OpCode.POP: {
            this.popStack();
            break;
          }
          case OpCode.GET_GLOBALS: {
            this.pushStack(frame.globals.scope);
            break;
          }
          case OpCode.GET_OUTER: {
            this.pushStack((frame.outer ?? frame.globals).scope);
            break;
          }
          case OpCode.GET_LOCALS: {
            this.pushStack(frame.locals.scope);
            break;
          }
          case OpCode.GET_SELF: {
            this.pushStack(frame.self ?? DefaultType.Void);
            break;
          }
          case OpCode.GET_SUPER: {
            this.pushStack(frame.super ?? DefaultType.Void);
            break;
          }
          case OpCode.IMPORT: {
            const importInstruction = instruction as ImportInstruction;
            const code = this.imports.get(importInstruction.path);
            this.createFrame({ code });
            break;
          }
          case OpCode.ASSIGN: {
            const value = this.popStack();
            const key = this.popStack();
            const base = this.popStack();

            if (!(base instanceof CustomValueWithIntrinsics)) {
              throw new RuntimeError(`Base left side must be a value with intrinsics!`, this);
            }

            base.set(key, value);
            break;
          }
          case OpCode.FUNCTION_DEFINITION: {
            const functionInstruction = instruction as FunctionDefinitionInstruction;
            const fn = new CustomFunction('anonymous', functionInstruction.code, functionInstruction.arguments, functionInstruction.ignoreOuter ? frame.globals : frame);
            this.pushStack(fn);
            break;
          }
          case OpCode.CALL: {
            const callInstruction = instruction as CallInstruction;
            const args = new Array(callInstruction.length);

            for (let i = 0; i < callInstruction.length; i++) {
              args[i] = this.popStack();
            }

            const fn = this.popStack();

            if (fn instanceof CustomFunction) {
              if (callInstruction.length > fn.arguments.length) {
                throw new Error('Too many arguments.');
              }

              const newFrame = this.createFrame({ code: fn.value, outer: fn.outer });
              const argsCount = args.length;

              for (let index = 0; index < argsCount; index++) {
                const argument = args.shift();
                const paramNum = argsCount - 1 - index;

                if (paramNum >= fn.arguments.length) {
                  throw new Error('Too many arguments.');
                }

                const param = fn.arguments[paramNum].name;

                if (param.toString() == "self") {
                  newFrame.self = argument;
                  newFrame.super = argument instanceof CustomMap ? (argument.getIsa() ?? new CustomMap()) : null;
                } else {
                  newFrame.set(param, argument);
                }
              }
              
              for (let paramNum = argsCount; paramNum < fn.arguments.length; paramNum++) {
                newFrame.set(fn.arguments[paramNum].name, fn.arguments[paramNum].defaultValue);
              }

              newFrame.injectContext();
            }

            break;
          }
          case OpCode.CALL_WITH_CONTEXT: {
            const callInstruction = instruction as CallInstruction;
            const args = new Array(callInstruction.length);

            for (let i = 0; i < callInstruction.length; i++) {
              args[i] = this.popStack();
            }

            const propertyName = this.popStack();
            const context = this.popStack() as CustomValueWithIntrinsics;
            const fn = context.get(propertyName, this.contextTypeIntrinsics);

            if (fn instanceof CustomFunction) {
              const newFrame = this.createFrame({
                code: fn.value,
                self: context,
                super: context instanceof CustomMap ? (context.getIsa() ?? new CustomMap()) : null,
                outer: fn.outer
              });
              const argsCount = args.length;
              let selfParam = fn.arguments.length > 0 && fn.arguments[0].name.toString() == "self" ? 1 : 0;

              for (let index = 0; index < argsCount; index++) {
                const argument = args.shift();
                const paramNum = argsCount - 1 - index + selfParam;

                if (paramNum >= fn.arguments.length) {
                  throw new Error('Too many arguments.');
                }

                const param = fn.arguments[paramNum].name;
                if (param.toString() !== "self") newFrame.set(param, argument);
              }

              for (let paramNum = argsCount + selfParam; paramNum < fn.arguments.length; paramNum++) {
                newFrame.set(fn.arguments[paramNum].name, fn.arguments[paramNum].defaultValue);
              }

              newFrame.injectContext();
            }

            break;
          }
          case OpCode.CALL_SUPER_PROPERTY: {
            const callInstruction = instruction as CallInstruction;
            const args = new Array(callInstruction.length);

            for (let i = 0; i < callInstruction.length; i++) {
              args[i] = this.popStack();
            }

            const property = this.popStack();
            const context = frame.super;

            if (!(context instanceof CustomValueWithIntrinsics)) {
              throw new RuntimeError(`Unknown path ${property.toString()}.`, this);
            }

            const ret = context.getWithOrigin(property, this.contextTypeIntrinsics);
            const fn = ret.value;

            if (fn instanceof CustomFunction) {
              const newFrame = this.createFrame({
                code: fn.value,
                self: frame.self,
                super: ret.origin instanceof CustomMap ? (ret.origin.getIsa() ?? new CustomMap()) : null,
                outer: fn.outer
              });
              let selfParam = fn.arguments.length > 0 && fn.arguments[0].name.toString() == "self" ? 1 : 0;
              const argsCount = args.length;

              for (let index = 0; index < argsCount; index++) {
                const argument = args.shift();
                const paramNum = argsCount - 1 - index + selfParam;

                if (paramNum >= fn.arguments.length) {
                  throw new Error('Too many arguments.');
                }

                const param = fn.arguments[paramNum].name;
                if (param.toString() !== "self") newFrame.set(param, argument);
              }

              for (let paramNum = argsCount + selfParam; paramNum < fn.arguments.length; paramNum++) {
                newFrame.set(fn.arguments[paramNum].name, fn.arguments[paramNum].defaultValue);
              }

              newFrame.injectContext();
            }

            break;
          }
          case OpCode.CONSTRUCT_MAP: {
            const mapConstructInstruction = instruction as ConstructMapInstruction;
            const map: [CustomValue, CustomValue][] = [];

            for (let index = 0; index < mapConstructInstruction.length; index++) {
              const value = this.popStack();
              const key = this.popStack();

              map.unshift([key, value]);
            }

            this.pushStack(new CustomMap(new ObjectValue(map)));
            break;
          }
          case OpCode.CONSTRUCT_LIST: {
            const listConstructInstruction = instruction as ConstructListInstruction;
            const list: CustomValue[] = [];

            for (let index = 0; index < listConstructInstruction.length; index++) {
              const value = this.popStack();

              list.unshift(value);
            }
            
            this.pushStack(new CustomList(list));
            break;
          }
          case OpCode.GOTO_A_IF_FALSE: {
            const condition = this.popStack();

            if (condition.toTruthy()) {
              break;
            }

            const gotoAInstruction = instruction as GotoAInstruction;
            frame.ip = gotoAInstruction.goto.ip;
            break;
          }
          case OpCode.GOTO_A_IF_FALSE_AND_PUSH: {
            const condition = this.popStack();
            const value: number = condition instanceof CustomNumber ? absClamp01(condition.value) : +condition.toTruthy();

            this.pushStack(new CustomNumber(value));

            if (value >= 1) {
              break;
            }

            const gotoAInstruction = instruction as GotoAInstruction;
            frame.ip = gotoAInstruction.goto.ip;
            break;
          }
          case OpCode.GOTO_A_IF_TRUE_AND_PUSH: {
            const condition = this.popStack();
            const value: number = condition instanceof CustomNumber ? absClamp01(condition.value) : +condition.toTruthy();

            this.pushStack(new CustomNumber(value));

            if (value < 1) {
              break;
            }

            const gotoAInstruction = instruction as GotoAInstruction;
            frame.ip = gotoAInstruction.goto.ip;
            break;
          }
          case OpCode.GOTO_A: {
            const gotoAInstruction = instruction as GotoAInstruction;
            frame.ip = gotoAInstruction.goto.ip;
            break;
          }
          case OpCode.GOTO_A_IF_FALSE: {
            const condition = this.popStack();

            if (condition.toTruthy()) {
              break;
            }

            const gotoAInstruction = instruction as GotoAInstruction;
            frame.ip = gotoAInstruction.goto.ip;
            break;
          }
          case OpCode.PUSH_ITERATOR: {
            const value = this.popStack() as CustomValueWithIntrinsics;
            const iterator = value[Symbol.iterator]();
            this.iterators.push(iterator);
            break;
          }
          case OpCode.POP_ITERATOR: {
            this.iterators.pop();
            break;
          }
          case OpCode.NEXT: {
            const nextInstruction = instruction as NextInstruction;
            let idx = frame.get(nextInstruction.idxVariable, this.contextTypeIntrinsics).toNumber();
            const iterator = this.iterators.peek();

            iterator.index = ++idx;

            const iteratorResult = iterator.next();

            this.pushStack(new CustomBoolean(!iteratorResult.done));

            if (!iteratorResult.done) {
              frame.set(nextInstruction.variable, iteratorResult.value);
              frame.set(nextInstruction.idxVariable, new CustomNumber(idx));
            }

            break;
          }
          case OpCode.GET_VARIABLE: {
            const getVariableInstroduction = instruction as GetVariableInstruction;
            const ret = frame.locals.get(getVariableInstroduction.property, this.contextTypeIntrinsics);

            if (ret instanceof CustomFunction && getVariableInstroduction.invoke) {
              const newFrame = this.createFrame({
                code: ret.value,
                outer: ret.outer
              });

              for (let paramNum = 0; paramNum < ret.arguments.length; paramNum++) {
                newFrame.set(ret.arguments[paramNum].name, ret.arguments[paramNum].defaultValue);
              }

              newFrame.injectContext();
              break;
            }

            this.pushStack(ret);
            break;
          }
          case OpCode.GET_PROPERTY: {
            const getPropertyInstruction = instruction as GetPropertyInstruction;
            const property = this.popStack();
            const context = this.popStack();

            if (!(context instanceof CustomValueWithIntrinsics)) {
              throw new RuntimeError(`Unknown path ${property.toString()}.`, this);
            }

            const ret = context.getWithOrigin(property, this.contextTypeIntrinsics);

            if (ret.value instanceof CustomFunction && getPropertyInstruction.invoke) {
              const newFrame = this.createFrame({
                code: ret.value.value,
                self: context,
                super: ret.origin instanceof CustomMap ? (ret.origin.getIsa() ?? new CustomMap()) : null,
                outer: ret.value.outer
              });

              for (let paramNum = 0; paramNum < ret.value.arguments.length; paramNum++) {
                newFrame.set(ret.value.arguments[paramNum].name, ret.value.arguments[paramNum].defaultValue);
              }

              newFrame.injectContext();
              break;
            }

            this.pushStack(ret.value);
            break;
          }
          case OpCode.GET_SUPER_PROPERTY: {
            const getPropertyInstruction = instruction as GetPropertyInstruction;
            const property = this.popStack();
            const ret = (frame.super as CustomValueWithIntrinsics).getWithOrigin(property, this.contextTypeIntrinsics);

            if (ret.value instanceof CustomFunction && getPropertyInstruction.invoke) {
              const newFrame = this.createFrame({
                code: ret.value.value,
                self: frame.self,
                super: ret.origin instanceof CustomMap ? (ret.origin.getIsa() ?? new CustomMap()) : null,
                outer: ret.value.outer
              });
              
              for (let paramNum = 0; paramNum < ret.value.arguments.length; paramNum++) {
                newFrame.set(ret.value.arguments[paramNum].name, ret.value.arguments[paramNum].defaultValue);
              }
              
              newFrame.injectContext();
              break;
            }

            this.pushStack(ret.value);
            break;
          }
          case OpCode.CALL_INTERNAL: {
            const callInstruction = instruction as CallInternalInstruction;
            const args: Map<string, CustomValue> = new Map();
            const callback = callInstruction.callback;

            for (const arg of callInstruction.arguments) {
              const value = frame.scope.value.get(arg.name);
              args.set(arg.name.toString(), value);
            }

            const immediateRet = callback(this, frame.self, args);

            // Due to transformations it can happen that return values may not be PromiseLike
            if (immediateRet?.then) {
                immediateRet.then((ret) => {
                    this.pushStack(ret);
                    this.resume(done);
                }).catch(done);
                return;
            }

            this.pushStack(immediateRet as unknown as CustomValue);
            break;
          }
          case OpCode.SLICE: {
            const b = this.popStack();
            const a = this.popStack();
            const value = this.popStack();
            if (value instanceof CustomList || value instanceof CustomString) {
              this.pushStack(value.slice(a, b));
            } else {
              this.pushStack(DefaultType.Void);
            }
            break;
          }
          case OpCode.NEW: {
            const value = this.popStack();
            if (value instanceof CustomMap) {
              this.pushStack(value.createInstance());
            } else {
              this.pushStack(value);
            }
            break;
          }
          case OpCode.NEGATE: {
            const value = this.popStack();
            this.pushStack(new CustomNumber(-value.toNumber()));
            break;
          }
          case OpCode.FALSIFY: {
            const value = this.popStack();
            this.pushStack(new CustomBoolean(!value.toTruthy()));
            break;
          }
          case OpCode.ISA: {
            const b = this.popStack();
            const a = this.popStack();
            this.pushStack(new CustomBoolean(a.instanceOf(b, this.contextTypeIntrinsics)));
            break;
          }
          case OpCode.BITWISE_AND: {
            const b = this.popStack();
            const a = this.popStack();
            this.pushStack(evalBitwiseAnd(a, b));
            break;
          }
          case OpCode.BITWISE_OR: {
            const b = this.popStack();
            const a = this.popStack();
            this.pushStack(evalBitwiseOr(a, b));
            break;
          }
          case OpCode.BITWISE_LEFT_SHIFT: {
            const b = this.popStack();
            const a = this.popStack();
            this.pushStack(evalBitwiseLeftShift(a, b));
            break;
          }
          case OpCode.BITWISE_RIGHT_SHIFT: {
            const b = this.popStack();
            const a = this.popStack();
            this.pushStack(evalBitwiseRightShift(a, b));
            break;
          }
          case OpCode.BITWISE_UNSIGNED_RIGHT_SHIFT: {
            const b = this.popStack();
            const a = this.popStack();
            this.pushStack(evalBitwiseUnsignedRightShift(a, b));
            break;
          }
          case OpCode.ADD: {
            const b = this.popStack();
            const a = this.popStack();
            this.pushStack(evalAdd(a, b));
            break;
          }
          case OpCode.SUB: {
            const b = this.popStack();
            const a = this.popStack();
            this.pushStack(evalSub(a, b));
            break;
          }
          case OpCode.MUL: {
            const b = this.popStack();
            const a = this.popStack();
            this.pushStack(evalMul(a, b));
            break;
          }
          case OpCode.DIV: {
            const b = this.popStack();
            const a = this.popStack();
            this.pushStack(evalDiv(a, b));
            break;
          }
          case OpCode.MOD: {
            const b = this.popStack();
            const a = this.popStack();
            this.pushStack(evalMod(a, b));
            break;
          }
          case OpCode.POW: {
            const b = this.popStack();
            const a = this.popStack();
            this.pushStack(evalPow(a, b));
            break;
          }
          case OpCode.EQUAL: {
            const b = this.popStack();
            const a = this.popStack();
            this.pushStack(evalEqual(a, b));
            break;
          }
          case OpCode.NOT_EQUAL: {
            const b = this.popStack();
            const a = this.popStack();
            this.pushStack(evalNotEqual(a, b));
            break;
          }
          case OpCode.GREATER_THAN: {
            const b = this.popStack();
            const a = this.popStack();
            this.pushStack(evalGreaterThan(a, b));
            break;
          }
          case OpCode.GREATER_THAN_OR_EQUAL: {
            const b = this.popStack();
            const a = this.popStack();
            this.pushStack(evalGreaterThanOrEqual(a, b));
            break;
          }
          case OpCode.LESS_THAN: {
            const b = this.popStack();
            const a = this.popStack();
            this.pushStack(evalLessThan(a, b));
            break;
          }
          case OpCode.LESS_THAN_OR_EQUAL: {
            const b = this.popStack();
            const a = this.popStack();
            this.pushStack(evalLessThanOrEqual(a, b));
            break;
          }
          case OpCode.AND: {
            const b = this.popStack();
            const a = this.popStack();
            this.pushStack(evalAnd(a, b));
            break;
          }
          case OpCode.OR: {
            const b = this.popStack();
            const a = this.popStack();
            this.pushStack(evalOr(a, b));
            break;
          }
          case OpCode.RETURN: {
            const value = this.popStack();
            this.popFrame();
            this.pushStack(value ?? DefaultType.Void);
            break;
          }
          case OpCode.GET_ENVAR: {
            const key = this.popStack();
            const value = this.environmentVariables.get(key.toString());
            this.pushStack(new CustomString(value));
            break;
          }
          case OpCode.BREAKPOINT: {
            if (this.debugger.getBreakpoint(this)) {
              this.debugger.interact(this, instruction.source);
              this.debugger.resume().then(() => {
                this.resume(done);
              }).catch(done);
              return;
            }
            break;
          }
          case OpCode.BREAKPOINT_ENABLE: {
            this.debugger.setBreakpoint(true);
            break;
          }
          case OpCode.HALT: {
            this.state = VMState.FINISHED;
            this.signal.emit('done');
            done();
            return;
          }
        }

        if (this.actionCount++ === this.maxActionsPerLoop) {
          this.actionCount = 0;
          setImmediate(() => {
            this.resume(done);
          });
          return;
        }
      }
    } catch (err: any) {
      done(err);
    }
  }
}