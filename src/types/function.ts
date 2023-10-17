import { ContextState, ContextType, OperationContext } from '../context';
import { Literal } from '../operations/literal';
import { Operation } from '../operations/operation';
import { Reference } from '../operations/reference';
import { ObjectValue } from '../utils/object-value';
import { CustomValue } from './base';
import { DefaultType } from './default';
import { CustomMap } from './map';
import { CustomNil } from './nil';
import { CustomString } from './string';

export interface Callback {
  (
    ctx: OperationContext,
    self: CustomValue,
    args: Map<string, CustomValue>,
    next?: CustomValue
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

  constructor(scope: OperationContext, name: string, callback: Callback) {
    super();
    this.scope = scope;
    this.name = name;
    this.value = callback;
    this.argumentDefs = [];
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
      if (item.defaultValue instanceof Literal) {
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
    const isSelfNull = self instanceof CustomNil;
    let index = 0;

    if (!isSelfNull) {
      for (; index < this.argumentDefs.length; index++) {
        const item = this.argumentDefs[index];
        if (item.name !== SELF_NAMESPACE) break;
      }
    }

    let argIndex = 0;

    for (; index < this.argumentDefs.length; index++) {
      const item = this.argumentDefs[index];

      if (!isSelfNull && item.name === SELF_NAMESPACE) {
        argIndex++;
        continue;
      }

      if (argMap.has(item.name)) {
        argIndex++;
        continue;
      }

      argMap.set(
        item.name,
        args[argIndex++] ?? (await item.defaultValue.handle(fnCtx))
      );
    }

    if (!isSelfNull) {
      argMap.set(SELF_NAMESPACE, self);
    }

    const isa = next ?? (self instanceof CustomMap ? self.isa : null);

    return this.value(fnCtx ?? callContext, self, argMap, isa);
  }
}
