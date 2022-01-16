import { Operation } from '../types/operation';
import IfOperation from './if';
import ElseIfOperation from './else-if';
import ElseOperation from './else';
import { OperationContext } from '../context';
import { ASTBase } from 'greybel-core';

export default class IfStatementOperation extends Operation {
	clauses: any[];

	constructor(ast: ASTBase) {
		super();
		const me = this;
		me.ast = ast;
		me.clauses = [];
	}

	async run(operationContext: OperationContext): Promise<void> {
		const me = this;
		const clauses = me.clauses;

		for (let clause of clauses) {
			if (clause instanceof IfOperation || clause instanceof ElseIfOperation) {
				const isValid = await clause.condition.get(operationContext);

				if (isValid.valueOf()) {
					await clause.body.run(operationContext);
					break;
				}
			} else if (clause instanceof ElseOperation) {
				await clause.body.run(operationContext);
				break;
			} else {
				operationContext.debugger.raise('Invalid operation in if statement.', me, clause);
			}
		}
	}
}