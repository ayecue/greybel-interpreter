import { isCustomValue } from '../typer';
import { Operation } from '../types/operation';
import { Expression } from '../types/expression';
import { ASTBase } from 'greybel-core';
import { OperationContext } from '../context';

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
			} else if (entity instanceof Expression) {
				args.push(await entity.get(operationContext, me));
			} else {
				operationContext.debugger.raise('Unexpected argument', me, entity);
			}
		}

		return args;
	}
}