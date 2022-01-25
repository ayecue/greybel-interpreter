import { isCustomValue } from '../typer';
import { Operation } from '../types/operation';
import PathExpression from '../expressions/path';
import AssignExpression from '../expressions/assign';
import { ASTBase } from 'greybel-core';
import { OperationContext } from '../context';
import CustomNil from '../custom-types/nil';

export default class ArgumentOperation extends Operation {
	stack: any[];

	constructor(ast: ASTBase[]) {
		super();
		const me = this;
		me.ast = ast;
		me.stack = [];
	}

	async get(operationContext: OperationContext): Promise<any[]> {
		const me = this;
		const stack = me.stack;
		const args = [];

		for (let entity of stack) {
			if (isCustomValue(entity)) {
				args.push(entity);
			} else if (entity instanceof AssignExpression) {
				await entity.get(operationContext, me);

				const arg = await entity.expr.left.get(operationContext, me);
				args.push(arg);
			} else if (entity instanceof PathExpression) {
				const arg = await entity.get(operationContext, me);
				operationContext.set(arg.path, new CustomNil());
				args.push(arg);
			} else {
				operationContext.debugger.raise('Unexpected argument', me, entity);
			}
		}

		return args;
	}
}