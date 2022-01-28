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

	async run(operationContext: OperationContext): Promise<void> {
		const me = this;
		const opc = operationContext.fork({
			type: ContextType.LOOP,
			state: ContextState.TEMPORARY
		});
		const loopContext = {
			isBreak: false,
			isContinue: false
		};
		const resolveCondition = async function(item: any): Promise<boolean> {
			if (item instanceof Expression) {
				const value = await item.get(opc);
				return value.toTruthy();
			} else if (item instanceof Operation) {
				const value = await item.get(opc);
				return value.toTruthy();
			} else if (isCustomValue(item)) {
				return item.toTruthy();
			}

			operationContext.debugger.raise('Unexpected condition', me, item);
		};

		opc.setMemory('loopContext', loopContext);

		return new Promise((resolve, reject) => {
			const iteration = async (): Promise<void> => {
				loopContext.isContinue = false;
				const condition = await resolveCondition(me.condition);
	
				if (!condition) {
					resolve();
					return;
				}
	
				await me.body.run(opc);
	
				if (loopContext.isBreak || operationContext.isExit()) {
					resolve();
					return;
				}
	
				process.nextTick(iteration);
			};

			iteration();
		});
	}
}