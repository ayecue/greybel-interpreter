import { Operation } from '../types/operation';
import { ASTBase } from 'greybel-core';
import BodyOperation from './body';

export interface ElseIfOperationOptions {
	condition: any;
	body: BodyOperation;
}

export default class ElseIfOperation extends Operation {
	condition: any;
	body: any;

	constructor(ast: ASTBase, options: ElseIfOperationOptions) {
		super();
		const me = this;
		me.ast = ast;
		me.condition = options.condition;
		me.body = options.body;
	}
}