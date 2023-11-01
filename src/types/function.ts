import { ContextState, ContextType, OperationContext } from '../context';
import { Literal } from '../operations/literal';
import { Operation } from '../operations/operation';
import { Reference } from '../operations/reference';
import { getStringHashCode } from '../utils/hash';
import { ObjectValue } from '../utils/object-value';
import { CustomValue } from './base';
import { DefaultType } from './default';
import { CustomNil } from './nil';
import { CustomString } from './string';

export interface Callback {
  (
    ctx: OperationContext,
    self: CustomValue,
    args: Map<string, CustomValue>
  ): Promise<NonNullable<CustomValue>>;
}

export const DEFAULT_FUNCTION_NAME = 'anonymous';
export const SELF_NAMESPACE = 'self';
export const SUPER_NAMESPACE = 'super';

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
    defaultValue: Operation | CustomValue = DefaultType.Void
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

export class CustomFunction extends CustomValue {
  static readonly intrinsics: ObjectValue = new ObjectValue();

  readonly scope?: OperationContext;
  readonly name: string;
  readonly value: Callback;
  readonly argumentDefs: Array<Argument>;
  readonly assignOuter: boolean;

  private _nextContext: CustomValue;

  static createExternalAnonymous(callback: Callback): CustomFunction {
    return new CustomFunction(null, DEFAULT_FUNCTION_NAME, callback);
  }

  static createExternal(name: string, callback: Callback): CustomFunction {
    return new CustomFunction(null, name, callback);
  }

  static createExternalWithSelf(
    name: string,
    callback: Callback
  ): CustomFunction {
    return new CustomFunction(null, name, callback).addArgument(SELF_NAMESPACE);
  }

  constructor(
    scope: OperationContext,
    name: string,
    callback: Callback,
    assignOuter: boolean = false
  ) {
    super();
    this.scope = scope;
    this.name = name;
    this.value = callback;
    this.argumentDefs = [];
    this.assignOuter = assignOuter;
    this._nextContext = null;
  }

  addArgument(
    name: string,
    defaultValue: Operation | CustomValue = DefaultType.Void
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
    let refs = 1;
    const args = this.argumentDefs.map((item: Argument) => {
      if (
        item.defaultValue instanceof Literal ||
        item.defaultValue instanceof Reference
      ) {
        const value = item.defaultValue.value;

        if (value instanceof CustomNil) {
          return item.name;
        } else if (value instanceof CustomString) {
          return `${item.name}="${value.value}"`;
        }

        return `${item.name}=${value.value}`;
      } else if (item.defaultValue.item != null) {
        return `${item.name}=_${refs++}`;
      }
      return item.name;
    });
    return `FUNCTION(${args.join(', ')})`;
  }

  toTruthy(): boolean {
    return true;
  }

  instanceOf(v: CustomValue): boolean {
    return v.value === CustomFunction.intrinsics;
  }

  setNextContext(value: CustomValue) {
    this._nextContext = value;
    return this;
  }

  getNextContext(): CustomValue {
    return this._nextContext;
  }

  async run(
    self: CustomValue,
    args: Array<CustomValue>,
    callContext: OperationContext
  ): Promise<CustomValue> {
    if (args.length > this.argumentDefs.length) {
      throw new Error('Too many arguments.');
    }

    const fnCtx = this.scope?.fork({
      type: ContextType.Function,
      state: ContextState.Default,
      ignoreOuter: !this.assignOuter,
      processState: callContext.processState
    });
    const argMap: Map<string, CustomValue> = new Map();
    const hasSelf = !(self instanceof CustomNil);
    let selfWithinArgs: CustomValue = DefaultType.Void;

    let argIndex = this.argumentDefs.length - 1;
    const selfParam =
      hasSelf && this.argumentDefs[0]?.name === SELF_NAMESPACE ? 1 : 0;

    for (; argIndex >= selfParam; argIndex--) {
      const item = this.argumentDefs[argIndex];

      if (item.name === SELF_NAMESPACE) {
        selfWithinArgs = args[argIndex - selfParam] ?? DefaultType.Void;
        continue;
      }

      argMap.set(
        item.name,
        args[argIndex - selfParam] ?? (await item.defaultValue.handle(fnCtx))
      );
    }

    const selfValue = hasSelf ? self : selfWithinArgs;

    if (selfValue) {
      argMap.set(SELF_NAMESPACE, selfValue);
    }

    const result = await this.value(fnCtx ?? callContext, selfValue, argMap);
    this._nextContext = null;
    return result;
  }

  hash() {
    return getStringHashCode(this.toString());
  }
}
