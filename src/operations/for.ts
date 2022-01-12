import { cast } from '../typer';
import { Operation } from '../types/operation';
import { OperationContext, ContextType, ContextState } from '../context';
import { ASTBase } from 'greybel-core';
import BodyOperation from './body';

export interface ForOperationOptions {
	variable: any;
	iterator: any;
	body: BodyOperation;
}

export default class ForOperation extends Operation {
	variable: any;
	iterator: any;
	body: BodyOperation;

	constructor(ast: ASTBase, options: ForOperationOptions) {
		super();
		const me = this;
		me.ast = ast;
		me.variable = options.variable;
		me.iterator = options.iterator;
		me.body = options.body;
	}

	async run(operationContext: OperationContext): Promise<void> {
		const me = this;
		const opc = operationContext.fork({
			type: ContextType.LOOP,
			state: ContextState.TEMPORARY
		});
		const variable = await me.variable.get(opc, me);
		const iterator = await me.iterator.get(opc);
		const loopContext = {
			isBreak: false,
			isContinue: false
		};

		opc.setMemory('loopContext', loopContext);

		for (let value of iterator) {
			loopContext.isContinue = false;
			await opc.set(variable.path, cast(value));
			await me.body.run(opc);
			if (loopContext.isContinue) continue;
			if (loopContext.isBreak) break;
		}
	}
}