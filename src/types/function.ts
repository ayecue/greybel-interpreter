import {
  FunctionDefinitionInstructionArgument,
  Instruction,
  OpCode
} from '../byte-compiler/instruction';
import { RuntimeKeyword } from '../byte-compiler/keywords';
import { OperationContext } from '../context';
import { ContextTypeIntrinsics } from '../context/types';
import { getStringHashCode } from '../utils/hash';
import { ObjectValue } from '../utils/object-value';
import { uuid } from '../utils/uuid';
import type { VM } from '../vm';
import { CustomValue } from './base';
import { DefaultType } from './default';
import { CustomNil } from './nil';
import { CustomString } from './string';

export interface CustomFunctionCallback {
  (vm: VM, self: CustomValue, args: Map<string, CustomValue>): Promise<
    NonNullable<CustomValue>
  >;
}

export class CustomFunction extends CustomValue {
  static readonly intrinsics: ObjectValue = new ObjectValue();

  static createExternal(name: string, callback: CustomFunctionCallback) {
    const args: FunctionDefinitionInstructionArgument[] = [];

    return new CustomFunction(
      name,
      [
        {
          op: OpCode.CALL_INTERNAL,
          source: {
            name: 'internal',
            path: 'internal',
            start: { line: 0, character: 0 },
            end: { line: 0, character: 0 }
          },
          callback,
          arguments: args
        },
        {
          op: OpCode.RETURN,
          source: {
            name: 'internal',
            path: 'internal',
            start: { line: 0, character: 0 },
            end: { line: 0, character: 0 }
          }
        }
      ],
      args
    );
  }

  static createExternalWithSelf(
    name: string,
    callback: CustomFunctionCallback
  ) {
    return this.createExternal(name, callback).addArgument(RuntimeKeyword.Self);
  }

  readonly outer?: OperationContext;
  readonly name: string;
  readonly id: string;
  readonly arguments: FunctionDefinitionInstructionArgument[];
  readonly value: Instruction[];

  constructor(
    name: string,
    value: Instruction[],
    args: FunctionDefinitionInstructionArgument[] = [],
    outer?: OperationContext
  ) {
    super();
    this.id = uuid();
    this.name = name;
    this.value = value;
    this.arguments = args;
    this.outer = outer;
  }

  addArgument(
    name: string,
    defaultValue: CustomValue = DefaultType.Void
  ): CustomFunction {
    this.arguments.push({
      name: new CustomString(name),
      defaultValue
    });
    return this;
  }

  fork(): CustomFunction {
    return new CustomFunction(
      this.name,
      this.value,
      this.arguments,
      this.outer
    );
  }

  forkAs(name: string): CustomFunction {
    return new CustomFunction(name, this.value, this.arguments, this.outer);
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
    const args = this.arguments.map((item) => {
      const value = item.defaultValue;

      if (value instanceof CustomNil) {
        return item.name;
      } else if (value instanceof CustomString) {
        return `${item.name}="${value.value}"`;
      }

      return `${item.name}=${value.value}`;
    });
    return `FUNCTION(${args.join(', ')})`;
  }

  toTruthy(): boolean {
    return true;
  }

  instanceOf(v: CustomValue, typeIntrinsics: ContextTypeIntrinsics): boolean {
    return v.value === (typeIntrinsics.function ?? CustomFunction.intrinsics);
  }

  hash() {
    return getStringHashCode(this.toString());
  }
}
