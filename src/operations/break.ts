import { Operation } from '../types/operation';
import { OperationContext } from '../context';
import { ASTBase } from 'greybel-core';

export default class BreakOperation extends Operation {
	constructor(ast: ASTBase) {
		super();
		const me = this;
		me.ast = ast;
	}

	run(operationContext: OperationContext) {
		const me = this;
		const loopContext = operationContext.getMemory('loopContext');

		loopContext.isBreak = true;
	}
}