import { Operation } from '../types/operation';
import { ASTBase } from 'greybel-core';
import BodyOperation from './body';

export interface IfOperationOptions {
	condition: any;
	body: BodyOperation;
}

export default class IfOperation extends Operation {
	condition: any;
	body: BodyOperation;

	constructor(ast: ASTBase, options: IfOperationOptions) {
		super();
		const me = this;
		me.ast = ast;
		me.condition = options.condition;
		me.body = options.body;
	}
}