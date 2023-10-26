import { EventEmitter } from 'events';
import { ASTBase } from 'greyscript-core';

import { CPS } from './cps';
import { HandlerContainer } from './handler-container';
import { Noop } from './operations/noop';
import { Operation, OperationBlock } from './operations/operation';
import { CustomValue } from './types/base';
import { DefaultType } from './types/default';
import { CustomMap } from './types/map';
import { CustomNil } from './types/nil';
import { ObjectValue } from './utils/object-value';
import { Path } from './utils/path';
import { setImmediate } from './utils/set-immediate';

export enum ContextType {
  Api,
  Global,
  Function,
  External,
  Loop,
  Map,
  Call
}

export enum ContextState {
  Temporary,
  Default
}

export class Scope extends CustomMap {
  /* eslint-disable no-use-before-define */
  private readonly context: OperationContext;

  constructor(context: OperationContext) {
    super();
    this.context = context;
  }

  get(path: Path<CustomValue> | CustomValue): CustomValue {
    if (path instanceof CustomValue) {
      return this.get(new Path<CustomValue>([path]));
    }

    if (path.count() === 0) {
      return this;
    }

    const traversalPath = path.clone();
    const current = traversalPath.next();

    if (this.has(path)) {
      return super.get(path);
    } else if (this.context.outer?.scope.has(path)) {
      return this.context.outer.scope.get(path);
    } else if (this.context.globals?.scope.has(path)) {
      return this.context.globals.scope.get(path);
    } else if (this.context.api?.scope.has(path)) {
      return this.context.api.scope.get(path);
    } else if (traversalPath.count() === 0 && CustomMap.getIntrinsics().has(current)) {
      return CustomMap.getIntrinsics().get(current);
    }

    throw new Error(`Unknown path ${path.toString()}.`);
  }
}

export class Debugger {
  private breakpoint: boolean = false;
  private nextStep: boolean = false;
  /* eslint-disable no-use-before-define */
  private lastContext: OperationContext = null;

  getLastContext(): OperationContext {
    return this.lastContext;
  }

  debug(...segments: any[]): CustomNil {
    console.debug(...segments);
    return DefaultType.Void;
  }

  setBreakpoint(breakpoint: boolean): Debugger {
    this.breakpoint = breakpoint;
    return this;
  }

  getBreakpoint(_ctx: OperationContext): boolean {
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

  interact(ctx: OperationContext, _ast: ASTBase, _op: Operation) {
    const me = this;
    console.warn('Debugger is not setup.');
    console.info(ctx);
    me.breakpoint = false;
  }
}

export class ProcessState extends EventEmitter {
  isExit: boolean = false;
  isPending: boolean = false;
  /* eslint-disable no-use-before-define */
  last: OperationContext = null;
}

export class LoopState {
  isBreak: boolean = false;
  isContinue: boolean = false;
}

export class FunctionState {
  value: CustomValue = DefaultType.Void;
  isReturn: boolean = false;
  context: CustomValue = null;
  super: CustomValue = null;
}

export interface ContextOptions {
  target?: string;
  stackTrace?: Operation[];
  /* eslint-disable no-use-before-define */
  previous?: OperationContext;
  type?: ContextType;
  state?: ContextState;
  isProtected?: boolean;
  injected?: boolean;
  debugger?: Debugger;
  handler?: HandlerContainer;
  cps?: CPS;
  processState?: ProcessState;
  environmentVariables?: Map<string, string>;
  ignoreOuter?: boolean;
}

export interface ContextForkOptions {
  type: ContextType;
  state: ContextState;
  target?: string;
  injected?: boolean;
  ignoreOuter?: boolean;
}

export class OperationContext {
  target: string;
  stackTrace: Operation[];
  debugger: Debugger;
  environmentVariables: Map<string, string>;
  handler: HandlerContainer;
  /* eslint-disable no-use-before-define */
  previous: OperationContext;

  readonly type: ContextType;
  readonly state: ContextState;
  readonly scope: Scope;
  readonly cps: CPS;

  readonly processState: ProcessState;
  loopState: LoopState;
  functionState: FunctionState;

  isProtected: boolean;
  injected: boolean;

  /* eslint-disable no-use-before-define */
  readonly api: OperationContext;
  /* eslint-disable no-use-before-define */
  readonly locals: OperationContext;
  /* eslint-disable no-use-before-define */
  readonly outer: OperationContext;
  /* eslint-disable no-use-before-define */
  readonly globals: OperationContext;

  private static readonly lookupApiType: Array<ContextType> = [ContextType.Api];
  private static readonly lookupGlobalsType: Array<ContextType> = [
    ContextType.Global
  ];

  private static readonly lookupLocalsType: Array<ContextType> = [
    ContextType.Global,
    ContextType.Function
  ];

  constructor(options: ContextOptions = {}) {
    this.target = options.target ?? 'unknown';
    this.stackTrace = options.stackTrace ?? [];
    this.previous = options.previous ?? null;
    this.type = options.type ?? ContextType.Api;
    this.state = options.state ?? ContextState.Default;
    this.scope = new Scope(this);
    this.isProtected = options.isProtected ?? false;
    this.injected = options.injected ?? false;
    this.debugger = options.debugger ?? new Debugger();
    this.handler = options.handler ?? new HandlerContainer();
    this.cps = options.cps ?? null;
    this.processState = options.processState ?? new ProcessState();
    this.environmentVariables = options.environmentVariables ?? new Map();
    this.functionState = new FunctionState();
    this.loopState = new LoopState();

    this.api = this.lookupApi();
    this.globals = this.lookupGlobals();
    this.locals = this.lookupLocals() ?? this;
    this.outer = (options.ignoreOuter ? null : this.lookupOuter()) ?? this.globals;
  }

  isIgnoredInDebugging(op: Operation): boolean {
    return op instanceof OperationBlock || op instanceof Noop;
  }

  async step(op: Operation): Promise<CustomValue> {
    if (this.isIgnoredInDebugging(op)) {
      return op.handle(this);
    }

    this.stackTrace.unshift(op);

    if (!this.injected) {
      this.target = op.target ?? this.target;

      this.setLastActive(this);

      if (this.debugger.getBreakpoint(this)) {
        this.processState.emit('breakpoint');
        this.debugger.interact(this, op.item, op);
        await this.debugger.resume();
      }
    }

    const result = await op.handle(this);

    this.stackTrace.shift();

    return result;
  }

  setLastActive(ctx: OperationContext): OperationContext {
    if (!ctx.injected) {
      this.processState.last = ctx;
    }
    return this;
  }

  getLastActive(): OperationContext {
    return this.processState.last;
  }

  isExit(): boolean {
    return this.processState.isExit;
  }

  isPending(): boolean {
    return this.processState.isPending;
  }

  setPending(pending: boolean): OperationContext {
    this.processState.isPending = pending;

    if (!this.processState.isPending && this.processState.isExit) {
      this.processState.isExit = false;
    }

    return this;
  }

  lookupAllOfType(
    validate: (type: ContextType) => boolean
  ): OperationContext[] {
    const me = this;
    const result = [];

    if (validate(me.type)) {
      result.push(me);
    }

    let current = me.previous;

    while (current) {
      if (validate(current.type)) {
        result.push(current);
      }

      current = current.previous;
    }

    return result;
  }

  exit(): Promise<OperationContext> {
    if (this.processState.isPending) {
      this.processState.isExit = true;
      this.processState.emit('exit');

      return new Promise((resolve) => {
        const check = () => {
          if (!this.processState.isPending) {
            resolve(this);
          } else {
            setImmediate(check);
          }
        };

        check();
      });
    }

    return Promise.reject(new Error('No running process found.'));
  }

  lookupType(allowedTypes: Array<ContextType>): OperationContext {
    if (allowedTypes.includes(this.type)) {
      return this;
    }

    let current = this.previous;

    while (current !== null) {
      if (allowedTypes.includes(current.type)) {
        return current;
      }

      current = current.previous;
    }

    return null;
  }

  lookupAllScopes(): OperationContext[] {
    return this.lookupAllOfType((type: ContextType) =>
      [ContextType.Global, ContextType.Function].includes(type)
    );
  }

  lookupApi(): OperationContext {
    return this.lookupType(OperationContext.lookupApiType);
  }

  lookupGlobals(): OperationContext {
    return this.lookupType(OperationContext.lookupGlobalsType);
  }

  lookupLocals(): OperationContext {
    return this.lookupType(OperationContext.lookupLocalsType);
  }

  lookupOuter(): OperationContext {
    return this.locals.previous?.lookupLocals() ?? null;
  }

  extend(map: ObjectValue): OperationContext {
    if (this.state === ContextState.Temporary) {
      this.previous?.extend(map);
    } else {
      this.scope.extend(map);
    }
    return this;
  }

  set(path: Path<CustomValue> | CustomValue, value: CustomValue) {
    if (path instanceof CustomValue) {
      this.set(new Path<CustomValue>([path]), value);
      return;
    }

    if (this.state === ContextState.Temporary) {
      this.previous?.set(path, value);
    } else {
      this.locals.scope.set(path, value);
    }
  }

  get(path: Path<CustomValue> | CustomValue): CustomValue {
    if (path instanceof CustomValue) {
      return this.get(new Path<CustomValue>([path]));
    }

    if (path.count() === 0) {
      return this.scope;
    }

    if (this.state === ContextState.Temporary) {
      return this.previous?.get(path);
    }

    return this.locals.scope.get(path);
  }

  fork(options: ContextForkOptions): OperationContext {
    const newContext = new OperationContext({
      target: options.target ?? this.target,
      stackTrace: this.stackTrace,
      previous: this,
      type: options.type,
      state: options.state,
      ignoreOuter: options.ignoreOuter,
      isProtected: false,
      injected: this.injected,
      debugger: this.debugger,
      handler: this.handler,
      cps: this.cps,
      processState: this.processState,
      environmentVariables: this.environmentVariables
    });

    if (options.type !== ContextType.Function) {
      if (options.type !== ContextType.Loop) {
        newContext.loopState = this.loopState;
      }

      newContext.functionState = this.functionState;
    }

    return newContext;
  }
}
