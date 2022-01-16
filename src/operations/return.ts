import { Operation } from '../types/operation';
import { Expression } from '../types/expression';
import { isCustomValue } from '../typer';
import { ASTBase } from 'greybel-core';
import { OperationContext } from '../context';

export interface ReturnOperationOptions {
	arg: any;
}

export default class ReturnOperation extends Operation {
	arg: any;

	constructor(ast: ASTBase, options: ReturnOperationOptions) {
		super();
		const me = this;
		me.ast = ast;
		me.arg = options.arg;
	}

	async run(operationContext: OperationContext) {
		const me = this;
		const functionContext = operationContext.getMemory('functionContext');
		let arg;

		if (isCustomValue(me.arg)) {
			arg = me.arg
		} else if (me.arg instanceof Expression) {
			arg = await me.arg.get(operationContext);
		} else if (me.arg instanceof Operation) {
			arg = await me.arg.get(operationContext);
		} else {
			operationContext.debugger.raise('Unexpected return value', me, me.arg);
		}

		functionContext.value = arg;
		functionContext.isReturn = true;
	}
}