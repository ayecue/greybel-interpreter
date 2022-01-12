import { Operation } from '../types/operation';
import { ASTBase } from 'greybel-core';
import { Expression } from '../types/expression';
import { OperationContext, ContextState, ContextType } from '../context';
import BodyOperation from './body';
import { isCustomValue } from '../typer';

export interface WhileOperationOptions {
	condition: any;
	body: BodyOperation;
}

export default class WhileOperation extends Operation {
	condition: any;
	body: BodyOperation;

	constructor(ast: ASTBase, options: WhileOperationOptions) {
		super();
		const me = this;
		me.ast = ast;
		me.condition = options.condition;
		me.body = options.body;
	}

	async run(operationContext: OperationContext) {
		const me = this;
		const opc = operationContext.fork({
			type: ContextType.LOOP,
			state: ContextState.TEMPORARY
		});
		const loopContext = {
			isBreak: false,
			isContinue: false
		};
		const resolveCondition = async function() {
			if (me.condition instanceof Expression) {
				const value = await me.condition.get(opc);
				return value.valueOf();
			} else if (isCustomValue(me.condition)) {
				return me.condition.valueOf();
			}
			
			operationContext.debugger.raise('Unexpected condition', me, me.condition);
		};

		opc.setMemory('loopContext', loopContext);

		while (await resolveCondition()) {
			loopContext.isContinue = false;
			await me.body.run(opc);
			if (loopContext.isContinue) continue;
			if (loopContext.isBreak) break;
		}
	}
}