import { Operation } from '../types/operation';
import { Expression } from '../types/expression';
import { isCustomValue, isCustomMap } from '../typer';
import { OperationContext } from '../context';
import { ASTBase } from 'greybel-core';

export interface NewOperationOptions {
	arg: any;
}

export default class NewOperation extends Operation {
	arg: any;

	constructor(ast: ASTBase, options: NewOperationOptions) {
		super();
		const me = this;
		me.ast = ast;
		me.arg = options.arg;
	}

	async get(operationContext: OperationContext): Promise<any> {
		const me = this;
		let arg;

		if (isCustomValue(me.arg)) {
			arg = me.arg;
		} else if (me.arg instanceof Expression) {
			arg = await me.arg.get(operationContext);
		} else {
			operationContext.debugger.raise('Unexpected reference', me, me.arg);
		}

		if (!isCustomMap(arg)) {
			operationContext.debugger.raise('Unexpected type for new operator', me, arg);
		}

		return arg.createInstance();
	}
}