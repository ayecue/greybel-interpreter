import {
  ASTAssignmentStatement,
  ASTFunctionStatement,
  ASTIdentifier,
  ASTType
} from 'greyscript-core';

import { FunctionState, OperationContext } from '../context';
import { CustomValue } from '../types/base';
import { DefaultType } from '../types/default';
import {
  CustomFunction,
  SELF_NAMESPACE,
  SUPER_NAMESPACE
} from '../types/function';
import { CustomString } from '../types/string';
import { CustomValueWithIntrinsics } from '../types/with-intrinsics';
import { Block } from './block';
import { CPSVisit, Operation } from './operation';
import { Reference } from './reference';

export const SELF_PROPERTY = new CustomString(SELF_NAMESPACE);
export const SUPER_PROPERTY = new CustomString(SUPER_NAMESPACE);

export interface FunctionOperationArgument {
  name: string;
  op: Operation;
}

export class FunctionOperation extends Operation {
  readonly item: ASTFunctionStatement;
  block: Operation;
  args: FunctionOperationArgument[];

  constructor(item: ASTFunctionStatement, target?: string) {
    super(null, target);
    this.item = item;
  }

  async build(visit: CPSVisit): Promise<Operation> {
    const stack = await Promise.all(
      this.item.body.map((child) => visit(child))
    );
    this.block = new Block(this.item, stack);
    this.args = await Promise.all(
      this.item.parameters.map(async (child) => {
        switch (child.type) {
          case ASTType.AssignmentStatement: {
            const assignStatement = child as ASTAssignmentStatement;
            const assignKey = assignStatement.variable as ASTIdentifier;
            return {
              name: assignKey.name,
              op: await visit(assignStatement.init)
            };
          }
          case ASTType.Identifier: {
            const identifierKey = child as ASTIdentifier;
            return {
              name: identifierKey.name,
              op: new Reference(DefaultType.Void)
            };
          }
          default:
            throw new Error('Unexpected operation in arguments.');
        }
      })
    );
    return this;
  }

  handle(ctx: OperationContext): Promise<CustomValue> {
    const func = new CustomFunction(
      ctx,
      'anonymous',
      async (
        fnCtx: OperationContext,
        self: CustomValue,
        args: Map<string, CustomValue>,
        next: CustomValue
      ): Promise<CustomValue> => {
        const functionState = new FunctionState();

        functionState.context = self;

        if (self instanceof CustomValueWithIntrinsics) {
          fnCtx.set(SELF_PROPERTY, self);
        }

        if (next) {
          fnCtx.set(SUPER_PROPERTY, next);
          functionState.super = next;
        }

        for (const [key, value] of args) {
          if (key === SELF_NAMESPACE) continue;
          fnCtx.set(new CustomString(key), value);
        }

        fnCtx.functionState = functionState;

        await this.block.handle(fnCtx);

        return functionState.value;
      }
    );

    for (const item of this.args) {
      func.addArgument(item.name, item.op);
    }

    return Promise.resolve(func);
  }
}
