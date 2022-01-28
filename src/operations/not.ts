import { Operation } from '../types/operation';
import { isCustomValue, isCustomMap, cast } from '../typer';
import { Expression } from '../types/expression';
import { OperationContext } from '../context';
import { ASTBase } from 'greybel-core';

export interface NotOperationOptions {
	arg: any;
}

export default class NotOperation extends Operation {
	arg: any;

	constructor(ast: ASTBase, options: NotOperationOptions) {
		super();
		const me = this;
		me.ast = ast;
		me.arg = options.arg;
	}

	async get(operationContext: OperationContext): Promise<any> {
		const me = this;
		let arg;

		if (isCustomValue(me.arg)) {
			arg = me.arg.toTruthy();
		} else if (me.arg instanceof Expression || me.arg instanceof Operation) {
			arg = await me.arg.get(operationContext);

			if (isCustomValue(arg)) {
				arg = arg.toTruthy();
			}
		} else {
			operationContext.debugger.raise(`Unexpected object used in not unary ${me.arg?.toString()}.`, me, me.arg);
		}

		return cast(!arg);
	}
}