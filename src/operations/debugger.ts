import { Operation } from '../types/operation';
import { OperationContext } from '../context';
import { ASTBase } from 'greybel-core';

export default class DebuggerOperation extends Operation {
	constructor(ast: ASTBase) {
		super();
		const me = this;
		me.ast = ast;
	}

	run(operationContext: OperationContext) {
		operationContext.debugger.setBreakpoint(true);
	}
}