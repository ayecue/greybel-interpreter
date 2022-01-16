import { Operation } from '../types/operation';
import { ASTBase } from 'greybel-core';
import BodyOperation from './body';

export interface ElseOperationOptions {
	body: BodyOperation;
}

export default class ElseOperation extends Operation {
	body: any;

	constructor(ast: ASTBase, options: ElseOperationOptions) {
		super();
		const me = this;
		me.ast = ast;
		me.body = options.body;
	}
}