import { Operation } from '../types/operation';
import { Expression } from '../types/expression';
import { CustomObjectType } from '../types/custom-type';
import { isCustomValue } from '../typer';
import { ASTBase } from 'greybel-core';
import { OperationContext } from '../context';

export interface ReferenceOperationOptions {
	arg: any;
}

export default class ReferenceOperation extends Operation {
	arg: any;

	constructor(ast: ASTBase, options: ReferenceOperationOptions) {
		super();
		const me = this;
		me.ast = ast;
		me.arg = options.arg;
	}

	async get(operationContext: OperationContext): Promise<any> {
		const me = this;
		let arg: any;

		if (isCustomValue(me.arg)) {
			return me.arg;
		} else if (me.arg instanceof Expression) {
			arg = await me.arg.get(operationContext, me);
		} else {
			operationContext.debugger.raise(`Unexpected reference ${me.arg?.toString()}.`, me, me.arg);
		}

		if (isCustomValue(arg)) {
			return arg;
		} else if (arg.handle) {
			if (arg.handle instanceof CustomObjectType) {
				return arg.handle.get(arg.path);
			}

			operationContext.debugger.raise(`Unexpected object as reference ${arg.handle?.toString()}.`, me, arg.handle);
		}

		return operationContext.get(arg.path);
	}
}