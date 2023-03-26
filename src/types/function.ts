import OperationContext, { ContextState, ContextType } from '../context';
import Operation from '../operations/operation';
import Reference from '../operations/reference';
import CustomValue from './base';
import Defaults from './default';
import CustomMap from './map';
import CustomNil from './nil';

export interface Callback {
  (
    ctx: OperationContext,
    self: CustomValue,
    args: Map<string, CustomValue>,
    next?: CustomValue
  ): Promise<NonNullable<CustomValue>>;
}

export class Argument {
  readonly name: string;
  readonly defaultValue: Operation;

  static createWithCustomValue(
    name: string,
    defaultValue: CustomValue
  ): Argument {
    return new Argument(name, new Reference(defaultValue));
  }

  constructor(
    name: string,
    defaultValue: Operation | CustomValue = Defaults.Void
  ) {
    this.name = name;

    if (defaultValue instanceof CustomValue) {
      this.defaultValue = new Reference(defaultValue);
    } else if (defaultValue instanceof Operation) {
      this.defaultValue = defaultValue;
    } else {
      throw new Error('Invalid defaultValue in argument.');
    }
  }
}

export default class CustomFunction extends CustomValue {
  readonly scope?: OperationContext;
  readonly name: string;
  readonly value: Callback;
  private injectSelf: boolean;
  readonly argumentDefs: Array<Argument>;

  static createExternalAnonymous(callback: Callback): CustomFunction {
    return new CustomFunction(null, 'anonymous', callback);
  }

  static createExternal(name: string, callback: Callback): CustomFunction {
    return new CustomFunction(null, name, callback);
  }

  static createExternalWithSelf(
    name: string,
    callback: Callback
  ): CustomFunction {
    return new CustomFunction(null, name, callback, true).addArgument('self');
  }

  constructor(
    scope: OperationContext,
    name: string,
    callback: Callback,
    injectSelf: boolean = false
  ) {
    super();
    this.scope = scope;
    this.name = name;
    this.value = callback;
    this.injectSelf = injectSelf;
    this.argumentDefs = [];
  }

  setInjectSelf(injectSelf: boolean): CustomFunction {
    this.injectSelf = injectSelf;
    return this;
  }

  addArgument(
    name: string,
    defaultValue: Operation | CustomValue = Defaults.Void
  ): CustomFunction {
    this.argumentDefs.push(new Argument(name, defaultValue));
    return this;
  }

  fork(): CustomValue {
    return new CustomFunction(this.scope, this.name, this.value);
  }

  getCustomType(): string {
    return 'function';
  }

  toNumber(): number {
    return Number.NaN;
  }

  toInt(): number {
    return 0;
  }

  toJSON(): string {
    return this.toString();
  }

  toString(): string {
    const args = this.argumentDefs.map((item: Argument) => item.name);
    return `FUNCTION(${args.join(', ')})`;
  }

  toTruthy(): boolean {
    return true;
  }

  instanceOf(v: CustomValue): boolean {
    return v instanceof CustomFunction;
  }

  async run(
    self: CustomValue,
    args: Array<CustomValue>,
    callContext: OperationContext,
    next?: CustomMap
  ): Promise<CustomValue> {
    const fnCtx = this.scope?.fork({
      type: ContextType.Function,
      state: ContextState.Default
    });
    const argMap: Map<string, CustomValue> = new Map();

    if (this.injectSelf && !(self instanceof CustomNil)) {
      args.unshift(self);
    }

    for (let index = 0; index < this.argumentDefs.length; index++) {
      const item = this.argumentDefs[index];

      argMap.set(
        item.name,
        args[index] || (await item.defaultValue.handle(fnCtx))
      );
    }

    const isa = next || (self instanceof CustomMap ? self.isa : null);

    return this.value(fnCtx || callContext, self, argMap, isa);
  }
}
