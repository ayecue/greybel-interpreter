import { Operation } from '../types/operation';
import { OperationContext, ContextType, ContextState } from '../context';
import { ASTBase } from 'greybel-core';
import BodyOperation from './body';

export interface ReturnOperationOptions {
	body: BodyOperation;
}

export default class TopOperation extends Operation {
	body: BodyOperation;

	constructor(ast: ASTBase, options: ReturnOperationOptions) {
		super();
		const me = this;
		me.ast = ast;
		me.body = options.body;
	}

	async run(operationContext: OperationContext): Promise<void> {
		const me = this;
		const opc = operationContext.fork(ContextType.GLOBAL, ContextState.DEFAULT);
		opc.scope.refs.set('globals', opc.scope);
		await me.body.run(opc);
	}
}