import {
  ASTAssignmentStatement,
  ASTFunctionStatement,
  ASTIdentifier,
  ASTType
} from 'greyscript-core';

import OperationContext, { FunctionState } from '../context';
import CustomValue from '../types/base';
import Defaults from '../types/default';
import CustomFunction from '../types/function';
import CustomString from '../types/string';
import Block from './block';
import Operation, { CPSVisit } from './operation';
import Reference from './reference';

export const SELF_PROPERTY = new CustomString('self');
export const SUPER_PROPERTY = new CustomString('super');

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
        args: Map<string, CustomValue>,
        next: CustomValue
      ): Promise<CustomValue> => {
        const functionState = new FunctionState();

        fnCtx.set(SELF_PROPERTY, self);
        functionState.context = self;

        if (next) {
          fnCtx.set(SUPER_PROPERTY, next);
          functionState.super = next;
        }

        fnCtx.set(new CustomString('locals'), fnCtx.locals.scope);
        fnCtx.set(new CustomString('outer'), fnCtx.previous.locals.scope);

        for (const [key, value] of args) {
          fnCtx.set(new CustomString(key), value);
        }

        fnCtx.functionState = functionState;

        await this.block.handle(fnCtx);

        return functionState.value;
      }
    );

    for (const [key, value] of this.args) {
      func.addArgument(key, value);
    }

    return Promise.resolve(func);
  }
}
