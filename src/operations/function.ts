import { FunctionOperationBase } from '../types/operation';
import { OperationContext, ContextType, ContextState } from '../context';
import { ASTBase } from 'greybel-core';
import ArgumentOperation from './argument';
import BodyOperation from './body';
import { cast } from '../typer';

export interface FunctionOperationOptions {
	args: ArgumentOperation;
	body: BodyOperation;
}

export default class FunctionOperation extends FunctionOperationBase {
	static incrementalId: number = 0;

	args: ArgumentOperation;
	body: BodyOperation;
	context: any;
	id: number;

	static generateId(): number{
		return FunctionOperation.incrementalId++;
	}

	constructor(ast: ASTBase, options: FunctionOperationOptions) {
		super();
		const me = this;
		me.ast = ast;
		me.id = FunctionOperation.generateId();
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

	toTruthy(): boolean {
		return true;
	}

	toNumber(): number {
		return Number.NaN;
	}

	valueOf(): FunctionOperation {
		return this;
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
			if (incArgs?.[index]) {
				await opc.set(args[index].path, incArgs[index]);
			}

			index++;
		}

		await me.body.run(opc);

		return cast(functionContext.value);
	}
}