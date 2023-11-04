import { EventEmitter } from 'events';
import { Parser } from 'greybel-core';

import {
  ContextOptions,
  ContextState,
  ContextType,
  Debugger,
  OperationContext
} from './context';
import { CPS, CPSContext } from './cps';
import { HandlerContainer } from './handler-container';
import { Noop } from './operations/noop';
import { Operation } from './operations/operation';
import { CustomValue } from './types/base';
import { DefaultType } from './types/default';
import { CustomFunction } from './types/function';
import { CustomList } from './types/list';
import { CustomMap } from './types/map';
import { CustomNumber } from './types/number';
import { CustomString } from './types/string';
import { PrepareError, RuntimeError } from './utils/error';
import { ObjectValue } from './utils/object-value';
import { CustomBoolean } from './types/boolean';

export const PARAMS_PROPERTY = new CustomString('params');
export const IS_GREYBEL_PROPERTY = new CustomString('IS_GREYBEL');

export interface InterpreterOptions {
  target?: string;
  api?: ObjectValue;
  params?: Array<string>;
  handler?: HandlerContainer;
  debugger?: Debugger;
  environmentVariables?: Map<string, string>;
}

export interface InterpreterRunOptions {
  customCode?: string;
  ctxOptions?: ContextOptions;
}

export class Interpreter extends EventEmitter {
  target: string;
  api: ObjectValue;
  params: Array<string>;
  environmentVariables: Map<string, string>;
  handler: HandlerContainer;
  debugger: Debugger;
  apiContext: OperationContext;
  globalContext: OperationContext;
  cps: CPS;

  constructor(options: InterpreterOptions) {
    super();

    this.handler = options.handler ?? new HandlerContainer();
    this.debugger = options.debugger ?? new Debugger();

    this.api = options.api ?? new ObjectValue();
    this.params = options.params ?? [];
    this.environmentVariables = options.environmentVariables ?? new Map();

    this.apiContext = null;
    this.globalContext = null;

    this.setTarget(options.target ?? 'unknown');
  }

  setTarget(target: string): Interpreter {
    if (this.apiContext !== null && this.apiContext.isPending()) {
      throw new Error('You cannot set a target while a process is running.');
    }

    this.target = target;

    return this;
  }

  setDebugger(dbgr: Debugger): Interpreter {
    if (this.apiContext !== null && this.apiContext.isPending()) {
      throw new Error('You cannot set a debugger while a process is running.');
    }

    this.debugger = dbgr;

    return this;
  }

  setApi(newApi: ObjectValue): Interpreter {
    if (this.apiContext !== null && this.apiContext.isPending()) {
      throw new Error('You cannot set an api object while a process is running.');
    }

    this.api = newApi;

    return this;
  }

  setHandler(handler: HandlerContainer): Interpreter {
    if (this.apiContext !== null && this.apiContext.isPending()) {
      throw new Error('You cannot set a handler while a process is running.');
    }

    this.handler = handler;

    return this;
  }

  prepare(code: string): Promise<Operation> {
    try {
      const parser = new Parser(code);
      const chunk = parser.parseChunk();
      return this.cps.visit(chunk);
    } catch (err: any) {
      if (err instanceof PrepareError) {
        this.handler.errorHandler.raise(err);
      } else {
        this.handler.errorHandler.raise(
          new PrepareError(err.message, {
            range: err.range,
            target: this.target
          })
        );
      }
    }

    return Promise.resolve(new Noop(null));
  }

  async inject(code: string, context?: OperationContext): Promise<Interpreter> {
    try {
      const top = await this.prepare(code);
      const injectionCtx = (context ?? this.globalContext).fork({
        type: ContextType.Call,
        state: ContextState.Temporary,
        injected: true
      });

      await top.handle(injectionCtx);
    } catch (err: any) {
      if (err instanceof PrepareError || err instanceof RuntimeError) {
        this.handler.errorHandler.raise(err);
      } else {
        this.handler.errorHandler.raise(
          new RuntimeError(err.message, this.apiContext.getLastActive(), err)
        );
      }
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

  private initScopes(ctxOptions: ContextOptions) {
    const cpsCtx = new CPSContext(this.target, this.handler);
    this.cps = new CPS(cpsCtx);

    const apiContext =  new OperationContext({
      target: this.target,
      isProtected: true,
      debugger: this.debugger,
      handler: this.handler,
      cps: this.cps,
      environmentVariables: this.environmentVariables,
      contextTypeIntrinsics: {
        string: CustomString.getIntrinsics().fork(),
        number: CustomNumber.getIntrinsics().fork(),
        list: CustomList.getIntrinsics().fork(),
        map: CustomMap.getIntrinsics().fork(),
        function: CustomFunction.intrinsics.fork()
      },
      ...ctxOptions
    });
    const stringIntrinsics = CustomMap.createWithInitialValue(apiContext.contextTypeIntrinsics.string);
    const numberIntrinsics = CustomMap.createWithInitialValue(apiContext.contextTypeIntrinsics.number);
    const listIntrinsics = CustomMap.createWithInitialValue(apiContext.contextTypeIntrinsics.list);
    const mapIntrinsics = CustomMap.createWithInitialValue(apiContext.contextTypeIntrinsics.map);
    const funcRefIntrinsics = CustomMap.createWithInitialValue(apiContext.contextTypeIntrinsics.function);

    apiContext.scope.set(new CustomString('string'), stringIntrinsics);
    apiContext.scope.set(new CustomString('number'), numberIntrinsics);
    apiContext.scope.set(new CustomString('list'), listIntrinsics);
    apiContext.scope.set(new CustomString('map'), mapIntrinsics);
    apiContext.scope.set(new CustomString('funcRef'), funcRefIntrinsics);
    apiContext.scope.extend(this.api);

    const globalContext = apiContext.fork({
      type: ContextType.Global,
      state: ContextState.Default
    });
    const newParams = new CustomList(
      this.params.map((item) => new CustomString(item))
    );

    globalContext.scope.set(IS_GREYBEL_PROPERTY, new CustomBoolean(true));
    globalContext.scope.set(PARAMS_PROPERTY, newParams);

    this.apiContext = apiContext;
    this.globalContext = globalContext;
  }

  private async start(top: Operation): Promise<Interpreter> {
    try {
      this.apiContext.setPending(true);

      const process = top.handle(this.globalContext);
      this.emit('start', this);
      await process;
    } catch (err: any) {
      if (err instanceof PrepareError || err instanceof RuntimeError) {
        this.handler.errorHandler.raise(err);
      } else {
        this.handler.errorHandler.raise(
          new RuntimeError(err.message, this.apiContext.getLastActive(), err)
        );
      }
    } finally {
      this.apiContext.setPending(false);
      this.emit('exit', this);
    }

    return this;
  }

  async run({
    customCode,
    ctxOptions
  }: InterpreterRunOptions = {}): Promise<Interpreter> {
    if (this.apiContext !== null && this.apiContext.isPending()) {
      throw new Error('Process already running.');
    }

    this.initScopes(ctxOptions);

    const code =
      customCode ?? (await this.handler.resourceHandler.get(this.target));
    const top = await this.prepare(code);

    return this.start(top);
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
      if (err instanceof PrepareError || err instanceof RuntimeError) {
        this.handler.errorHandler.raise(err);
      } else {
        this.handler.errorHandler.raise(
          new RuntimeError(err.message, this.apiContext.getLastActive(), err)
        );
      }
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
    return DefaultType.Void;
  }
}
