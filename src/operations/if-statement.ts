import { Operation } from '../types/operation';
import { Expression } from '../types/expression';
import IfOperation from './if';
import ElseIfOperation from './else-if';
import ElseOperation from './else';
import { OperationContext } from '../context';
import { ASTBase } from 'greybel-core';
import { isCustomValue } from '../typer';

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
				const condition = clause.condition;
				let isValid;

				if (isCustomValue(condition)) {
					isValid = condition.valueOf();
				} else if (
					condition instanceof Expression ||
					condition instanceof Operation
				) {
					isValid = await condition.get(operationContext);
				} else {
					operationContext.debugger.raise('Unexpected condition in clause', me, clause.condition);
				}

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