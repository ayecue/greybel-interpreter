import { FunctionOperationBase } from '../types/operation';
import { v4 as uuidv4 } from 'uuid';
import { OperationContext, ContextType, ContextState } from '../context';
import { ASTBase } from 'greybel-core';
import ArgumentOperation from './argument';
import BodyOperation from './body';

export interface FunctionOperationOptions {
	args: ArgumentOperation;
	body: BodyOperation;
}

export default class FunctionOperation extends FunctionOperationBase {
	args: ArgumentOperation;
	body: BodyOperation;
	context: any;
	id: string;

	constructor(ast: ASTBase, options: FunctionOperationOptions) {
		super();
		const me = this;
		me.ast = ast;
		me.id = uuidv4();
		me.args = options.args;
		me.body = options.body;
		me.context = null;
	}

	getType(): string {
		return 'function';
	}

	fork(context: any): FunctionOperation {
		const me = this;
		const newFunction = new FunctionOperation(me.ast, {
			args: me.args,
			body: me.body
		});

		newFunction.context = context;

		return newFunction;
	}

	get(operationContext: OperationContext): FunctionOperation {
		return this;
	}

	toString(): string {
		return 'Function';
	}

	async run(operationContext: OperationContext): Promise<any> {
		const me = this;
		const opc = operationContext.fork({
			type: ContextType.FUNCTION,
			state: ContextState.DEFAULT
		});
		const incArgs = operationContext.getMemory('args');
		const args = await me.args.get(opc);
		const argMap = {};
		const functionContext: { [key: string]: any } = {
			value: null,
			isReturn: false,
			context: me.context
		};

		opc.setMemory('functionContext', functionContext);

		let index = 0;
		const max = args.length;

		while (index < max) {
			await opc.set(args[index].path[0], incArgs[index]);
			index++;
		}

		await me.body.run(opc);

		return functionContext.value;
	}
}