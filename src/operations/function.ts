import {
  ASTAssignmentStatement,
  ASTFunctionStatement,
  ASTIdentifier,
  ASTType
} from 'greyscript-core';

import OperationContext, { FunctionState } from '../context';
import Defaults from '../types/default';
import CustomFunction from '../types/function';
import { CustomValue } from '../types/generics';
import CustomString from '../types/string';
import Block from './block';
import Operation, { CPSVisit } from './operation';
import Reference from './reference';

export const SELF_PROPERTY = new CustomString('self');

export default class FunctionOperation extends Operation {
  readonly item: ASTFunctionStatement;
  block: Operation;
  args: Map<string, Operation>;

  constructor(item: ASTFunctionStatement, target?: string) {
    super(null, target);
    this.item = item;
  }

  async build(visit: CPSVisit): Promise<Operation> {
    const stack = await Promise.all(
      this.item.body.map((child) => visit(child))
    );
    this.block = new Block(stack);
    this.args = new Map<string, Operation>();
    const defers = this.item.parameters.map(async (child) => {
      switch (child.type) {
        case ASTType.AssignmentStatement: {
          const assignStatement = child as ASTAssignmentStatement;
          const assignKey = assignStatement.variable as ASTIdentifier;
          this.args.set(assignKey.name, await visit(assignStatement.init));
          break;
        }
        case ASTType.Identifier: {
          const identifierKey = child as ASTIdentifier;
          this.args.set(identifierKey.name, new Reference(Defaults.Void));
          break;
        }
        default:
          throw new Error('Unexpected operation in arguments.');
      }
    });
    await Promise.all(defers);
    return this;
  }

  handle(ctx: OperationContext): Promise<CustomValue> {
    const func = new CustomFunction(
      ctx,
      'anonymous',
      async (
        fnCtx: OperationContext,
        self: CustomValue,
        args: Map<string, CustomValue>
      ): Promise<CustomValue> => {
        fnCtx.functionState = new FunctionState();

        fnCtx.set(SELF_PROPERTY, self);

        for (const [key, value] of args) {
          fnCtx.set(new CustomString(key), value);
        }

        await this.block.handle(fnCtx);

        return fnCtx.functionState.value;
      }
    );

    for (const [key, value] of this.args) {
      func.addArgument(key, value);
    }

    return Promise.resolve(func);
  }
}
