import { EventEmitter } from 'events';

import {
  ContextType,
  OperationContext
} from './context';
import { HandlerContainer } from './handler-container';
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
import { Debugger, VM, VMOptions } from './vm';
import { BytecodeCompileResult, BytecodeGenerator } from './bytecode-generator';

export const PARAMS_PROPERTY = new CustomString('params');
export const IS_GREYBEL_PROPERTY = new CustomString('IS_GREYBEL');

export interface InterpreterOptions {
  target?: string;
  api?: ObjectValue;
  params?: Array<string>;
  handler?: HandlerContainer;
  debugger?: Debugger;
  debugMode?: boolean;
  environmentVariables?: Map<string, string>;
}

export interface InterpreterRunOptions {
  customCode?: string;
  vmOptions?: Partial<VMOptions>;
}

export class Interpreter extends EventEmitter {
  target: string;
  api: ObjectValue;
  params: Array<string>;
  environmentVariables: Map<string, string>;
  handler: HandlerContainer;
  debugger: Debugger;
  debugMode: boolean;
  apiContext: OperationContext;
  globalContext: OperationContext;
  vm: VM;

  constructor(options: InterpreterOptions = {}) {
    super();

    this.handler = options.handler ?? new HandlerContainer();
    this.debugger = options.debugger ?? new Debugger();

    this.vm = null;
    this.api = options.api ?? new ObjectValue();
    this.params = options.params ?? [];
    this.environmentVariables = options.environmentVariables ?? new Map();

    this.debugMode = options.debugMode ?? false;
    this.apiContext = null;
    this.globalContext = null;

    this.setTarget(options.target ?? 'unknown');
  }

  setTarget(target: string): Interpreter {
    if (this.vm !== null && this.vm.isPending()) {
      throw new Error('You cannot set a target while a process is running.');
    }

    this.target = target;

    return this;
  }

  setDebugger(dbgr: Debugger): Interpreter {
    if (this.vm !== null && this.vm.isPending()) {
      throw new Error('You cannot set a debugger while a process is running.');
    }

    this.debugger = dbgr;

    return this;
  }

  setApi(newApi: ObjectValue): Interpreter {
    if (this.vm !== null && this.vm.isPending()) {
      throw new Error('You cannot set a api while a process is running.');
    }

    this.api = newApi;

    return this;
  }

  setHandler(handler: HandlerContainer): Interpreter {
    if (this.vm !== null && this.vm.isPending()) {
      throw new Error('You cannot set a handler while a process is running.');
    }

    this.handler = handler;

    return this;
  }

  async inject(code: string, context?: OperationContext): Promise<Interpreter> {
    const bytecodeGenerator = new BytecodeGenerator({
      target: 'injected',
      handler: this.handler
    });
    const result = await bytecodeGenerator.compile(code);
    const vm = new VM({
      target: this.target,
      debugger: this.debugger,
      handler: this.handler,
      environmentVariables: this.environmentVariables,
      contextTypeIntrinsics: this.vm.contextTypeIntrinsics,
      globals: (context ?? this.globalContext).fork({
        code: result.code,
        type: ContextType.Injected
      }),
      imports: result.imports
    });

    try {
      await vm.exec();
    } catch (err: any) {
      if (err instanceof PrepareError || err instanceof RuntimeError) {
        this.handler.errorHandler.raise(err);
      } else {
        this.handler.errorHandler.raise(
          new RuntimeError(err.message, vm, err)
        );
      }
    }

    return this;
  }

  async injectInLastContext(code: string): Promise<Interpreter> {
    if (this.vm !== null && this.vm.isPending()) {
      const last = this.vm.getFrame();
      return this.inject(code, last);
    }

    throw new Error('Unable to inject into last context.');
  }

  protected initVM(result: BytecodeCompileResult, options?: Partial<VMOptions>) {
    const apiContext =  new OperationContext({
      isProtected: true,
      code: [],
    });
    const globalContext = apiContext.fork({
      type: ContextType.Global,
      code: result.code
    });
    const vm = new VM({
      target: this.target,
      debugger: this.debugger,
      handler: this.handler,
      environmentVariables: this.environmentVariables,
      contextTypeIntrinsics: {
        string: CustomString.getIntrinsics().fork(),
        number: CustomNumber.getIntrinsics().fork(),
        list: CustomList.getIntrinsics().fork(),
        map: CustomMap.getIntrinsics().fork(),
        function: CustomFunction.intrinsics.fork()
      },
      globals: globalContext,
      imports: result.imports,
      ...options
    });

    const stringIntrinsics = CustomMap.createWithInitialValue(vm.contextTypeIntrinsics.string);
    const numberIntrinsics = CustomMap.createWithInitialValue(vm.contextTypeIntrinsics.number);
    const listIntrinsics = CustomMap.createWithInitialValue(vm.contextTypeIntrinsics.list);
    const mapIntrinsics = CustomMap.createWithInitialValue(vm.contextTypeIntrinsics.map);
    const funcRefIntrinsics = CustomMap.createWithInitialValue(vm.contextTypeIntrinsics.function);

    apiContext.scope.set(new CustomString('string'), stringIntrinsics);
    apiContext.scope.set(new CustomString('number'), numberIntrinsics);
    apiContext.scope.set(new CustomString('list'), listIntrinsics);
    apiContext.scope.set(new CustomString('map'), mapIntrinsics);
    apiContext.scope.set(new CustomString('funcRef'), funcRefIntrinsics);
    apiContext.scope.extend(this.api);

    const newParams = new CustomList(
      this.params.map((item) => new CustomString(item))
    );

    globalContext.scope.set(IS_GREYBEL_PROPERTY, new CustomBoolean(true));
    globalContext.scope.set(PARAMS_PROPERTY, newParams);

    this.vm = vm;
    this.apiContext = apiContext;
    this.globalContext = globalContext;
  }

  protected async start(): Promise<Interpreter> {
    try {
      const process = this.vm.exec();
      this.emit('start', this);
      await process;
    } catch (err: any) {
      if (err instanceof PrepareError || err instanceof RuntimeError) {
        this.handler.errorHandler.raise(err);
      } else {
        this.handler.errorHandler.raise(
          new RuntimeError(err.message, this.vm, err)
        );
      }
    } finally {
      this.emit('exit', this);
    }

    return this;
  }

  async run({
    customCode,
    vmOptions
  }: InterpreterRunOptions = {}): Promise<Interpreter> {
    const code =
      customCode ?? (await this.handler.resourceHandler.get(this.target));
    const bytecodeConverter = new BytecodeGenerator({
      target: this.target,
      handler: this.handler,
      debugMode: this.debugMode
    });
    const bytecode = await bytecodeConverter.compile(code);

    this.initVM(bytecode, vmOptions);

    return this.start();
  }

  resume(): Interpreter {
    if (this.vm !== null && this.vm.isPending()) {
      this.debugger.setBreakpoint(false);
    }
    return this;
  }

  pause(): Interpreter {
    if (this.vm !== null && this.vm.isPending()) {
      this.debugger.setBreakpoint(true);
    }
    return this;
  }

  exit(): void {
    this.vm.exit();
  }

  setGlobalVariable(path: string, value: CustomValue): Interpreter {
    if (this.globalContext != null) {
      this.globalContext.set(new CustomString(path), value);
    }
    return this;
  }

  getGlobalVariable(path: string): CustomValue {
    if (this.globalContext != null) {
      return this.globalContext.get(new CustomString(path), this.vm.contextTypeIntrinsics);
    }
    return DefaultType.Void;
  }
}
