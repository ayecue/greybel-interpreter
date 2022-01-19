import { Operation } from '../types/operation';
import { ASTBase } from 'greybel-core';
import { Expression } from '../types/expression';
import {
	OperationContext,
	ContextType
} from '../context';

export default class BodyOperation extends Operation {
	stack: any[];

	constructor(ast: ASTBase[]) {
		super();
		const me = this;
		me.ast = ast;
		me.stack = [];
	}

	async run(operationContext: OperationContext) {
		const me = this;
		const dbgr = operationContext.debugger;
		let isEOL = () => false;

		if (operationContext.type === ContextType.LOOP ) {
			const context = operationContext.getMemory('loopContext');

			isEOL = () => context.isBreak || context.isContinue;
		} else if (operationContext.type === ContextType.FUNCTION) {
			const context = operationContext.getMemory('functionContext');

			isEOL = () => context.isReturn;
		}

		for (let entity of me.stack) {
			operationContext.line = entity.ast.line;

			if (dbgr.getBreakpoint(operationContext)) {
				dbgr.interact(operationContext, entity);
				await dbgr.resume();
			}

			if (entity instanceof Expression) {
				await entity.get(operationContext);
			} else {
				await entity.run(operationContext);
			}
			if (isEOL() || operationContext.isExit()) break;
		}
	}
}