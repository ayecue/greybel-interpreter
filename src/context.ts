import { ASTBase } from 'greyscript-core';

import CPS from './cps';
import HandlerContainer from './handler-container';
import Operation from './operations/operation';
import Defaults from './types/default';
import { CustomValue } from './types/generics';
import CustomMap from './types/map';
import CustomNil from './types/nil';
import Path from './utils/path';

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

    if (current.value === 'locals' || current.value === 'globals') {
      return this.context.get(traversalPath);
    } else if (this.has(path)) {
      return super.get(path);
    } else if (this.context.api.scope.has(path)) {
      return this.context.api.scope.get(path);
    } else if (path.count() === 1 && CustomMap.getIntrinsics().has(current.toString())) {
      return CustomMap.getIntrinsics().get(current.toString());
    } else if (this.context.previous !== null) {
      return this.context.previous.get(path);
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
    return Defaults.Void;
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
    if (this.breakpoint) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      const check = () => {
        if (this.breakpoint) {
          resolve();
        } else if (this.nextStep) {
          this.nextStep = false;
          resolve();
        } else {
          setTimeout(check, 10);
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

export class ProcessState {
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
  value: CustomValue = Defaults.Void;
  isReturn: boolean = false;
}

export interface ContextOptions {
  target?: string;
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
}

export interface ContextForkOptions {
  type: ContextType;
  state: ContextState;
  target?: string;
  injected?: boolean;
}

export default class OperationContext {
  target: string;
  stackItem: ASTBase;
  debugger: Debugger;
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
    this.target = options.target || 'unknown';
    this.stackItem = null;
    this.previous = options.previous || null;
    this.type = options.type || ContextType.Api;
    this.state = options.state || ContextState.Default;
    this.scope = new Scope(this);
    this.isProtected = options.isProtected || false;
    this.injected = options.injected || false;
    this.debugger = options.debugger || new Debugger();
    this.handler = options.handler || new HandlerContainer();
    this.cps = options.cps || null;
    this.processState = options.processState || new ProcessState();

    this.api = this.lookupApi();
    this.globals = this.lookupGlobals();
    this.locals = this.lookupLocals() || this;
  }

  step(op: Operation): Promise<void> {
    if (!this.injected) {
      this.stackItem = op.item;
      this.target = op.target || this.target;

      this.setLastActive(this);

      if (this.debugger.getBreakpoint(this)) {
        this.debugger.interact(this, op.item, op);
        return this.debugger.resume();
      }
    }

    return Promise.resolve();
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

      return new Promise((resolve) => {
        const check = () => {
          if (!this.processState.isPending) {
            this.processState.isExit = false;
            resolve(this);
          } else {
            setTimeout(check, 10);
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

  extend(map: Map<CustomValue, CustomValue>): OperationContext {
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

    const traversalPath = path.clone();
    const current = traversalPath.next();

    if (current.value === 'locals') {
      this.locals.set(traversalPath, value);
    } else if (current.value === 'globals') {
      this.globals.set(traversalPath, value);
    } else if (this.state === ContextState.Temporary) {
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

    const traversalPath = path.clone();
    const current = traversalPath.next();

    if (current.value === 'locals') {
      return this.locals.get(traversalPath);
    } else if (current.value === 'globals') {
      return this.globals.get(traversalPath);
    } else if (this.state === ContextState.Temporary) {
      return this.previous?.get(path);
    }

    return this.locals.scope.get(path);
  }

  fork(options: ContextForkOptions): OperationContext {
    const newContext = new OperationContext({
      target: options.target || this.target,
      previous: this,
      type: options.type,
      state: options.state,
      isProtected: false,
      injected: this.injected,
      debugger: this.debugger,
      handler: this.handler,
      cps: this.cps,
      processState: this.processState
    });

    if (this.type !== ContextType.Function) {
      if (this.type !== ContextType.Loop) {
        newContext.loopState = this.loopState;
      }

      newContext.functionState = this.functionState;
    }

    return newContext;
  }
}
