import EventEmitter from 'events';
import { Parser } from 'greybel-core';

import OperationContext, {
  ContextState,
  ContextType,
  Debugger
} from './context';
import CPS, { CPSContext } from './cps';
import HandlerContainer from './handler-container';
import Noop from './operations/noop';
import Operation from './operations/operation';
import Defaults from './types/default';
import { CustomValue, ObjectValue } from './types/generics';
import CustomList from './types/list';
import CustomString from './types/string';

export const PARAMS_PROPERTY = new CustomString('params');

export interface InterpreterOptions {
  target?: string;
  api?: Map<string, CustomValue>;
  params?: Array<string>;
  handler?: HandlerContainer;
  debugger?: Debugger;
}

export default class Interpreter extends EventEmitter {
  target: string;
  api: Map<string, CustomValue>;
  params: Array<string>;
  handler: HandlerContainer;
  debugger: Debugger;
  apiContext: OperationContext;
  globalContext: OperationContext;
  cps: CPS;

  constructor(options: InterpreterOptions) {
    super();

    this.handler = options.handler || new HandlerContainer();
    this.debugger = options.debugger || new Debugger();

    this.api = options.api || new Map();
    this.params = options.params || [];

    this.apiContext = null;
    this.globalContext = null;

    this.setTarget(options.target || 'unknown');
  }

  setTarget(target: string): Interpreter {
    if (this.apiContext !== null && this.apiContext.isPending()) {
      throw new Error('You cannot set a target while a process is running.');
    }

    this.target = target;

    const cpsCtx = new CPSContext(target, this.handler);
    this.cps = new CPS(cpsCtx);

    this.apiContext = new OperationContext({
      target,
      isProtected: true,
      debugger: this.debugger,
      handler: this.handler,
      cps: this.cps
    });

    this.globalContext = this.apiContext.fork({
      type: ContextType.Global,
      state: ContextState.Default
    });

    return this;
  }

  setDebugger(dbgr: Debugger): Interpreter {
    if (this.apiContext !== null && this.apiContext.isPending()) {
      throw new Error('You cannot set a target while a process is running.');
    }

    this.debugger = dbgr;
    this.apiContext.debugger = dbgr;
    this.globalContext.debugger = dbgr;

    return this;
  }

  setApi(newApi: Map<string, CustomValue>): Interpreter {
    if (this.apiContext !== null && this.apiContext.isPending()) {
      throw new Error('You cannot set a target while a process is running.');
    }

    this.api = newApi;

    return this;
  }

  setHandler(handler: HandlerContainer): Interpreter {
    if (this.apiContext !== null && this.apiContext.isPending()) {
      throw new Error('You cannot set a target while a process is running.');
    }

    this.handler = handler;
    this.apiContext.handler = handler;
    this.globalContext.handler = handler;

    return this;
  }

  prepare(code: string): Promise<Operation> {
    try {
      const parser = new Parser(code);
      const chunk = parser.parseChunk();
      return this.cps.visit(chunk);
    } catch (err: any) {
      this.handler.errorHandler.raise(err);
    }

    return Promise.resolve(new Noop());
  }

  async inject(code: string, context?: OperationContext): Promise<Interpreter> {
    try {
      const top = await this.prepare(code);
      const injectionCtx = (context || this.globalContext).fork({
        type: ContextType.Call,
        state: ContextState.Temporary,
        injected: true
      });

      await top.handle(injectionCtx);
    } catch (err) {
      this.handler.errorHandler.raise(err);
    }

    return this;
  }

  async injectInLastContext(code: string): Promise<Interpreter> {
    const last = this.apiContext.getLastActive();

    if (this.apiContext !== null && this.apiContext.isPending()) {
      return this.inject(code, last);
    }

    throw new Error('Unable to inject into last context.');
  }

  async run(customCode?: string): Promise<Interpreter> {
    const code =
      customCode || (await this.handler.resourceHandler.get(this.target));
    const top = await this.prepare(code);

    return this.start(top);
  }

  async start(top: Operation): Promise<Interpreter> {
    if (this.apiContext !== null && this.apiContext.isPending()) {
      throw new Error('Process already running.');
    }

    const api = Array.from(this.api.entries()).reduce(
      (result, [key, value]) => {
        result.set(new CustomString(key), value);
        return result;
      },
      new ObjectValue()
    );

    this.apiContext.extend(api);

    const newParams = new CustomList(
      this.params.map((item) => new CustomString(item))
    );

    this.globalContext.scope.set(PARAMS_PROPERTY, newParams);

    try {
      this.apiContext.setPending(true);

      const process = top.handle(this.globalContext);
      this.emit('start', this);
      await process;
    } catch (err: any) {
      this.handler.errorHandler.raise(err);
    } finally {
      this.apiContext.setPending(false);
      this.emit('exit', this);
    }

    return this;
  }

  resume(): Interpreter {
    if (this.apiContext !== null && this.apiContext.isPending()) {
      this.debugger.setBreakpoint(false);
    }
    return this;
  }

  pause(): Interpreter {
    if (this.apiContext !== null && this.apiContext.isPending()) {
      this.debugger.setBreakpoint(true);
    }
    return this;
  }

  exit(): Promise<OperationContext> {
    try {
      return this.apiContext.exit();
    } catch (err: any) {
      this.handler.errorHandler.raise(err);
    }
  }

  setGlobalVariable(path: string, value: CustomValue): Interpreter {
    if (this.globalContext != null) {
      this.globalContext.set(new CustomString(path), value);
    }
    return this;
  }

  getGlobalVariable(path: string): CustomValue {
    if (this.globalContext != null) {
      this.globalContext.get(new CustomString(path));
    }
    return Defaults.Void;
  }
}
