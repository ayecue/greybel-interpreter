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
				const resolveCondition = async function(item: any): Promise<boolean> {
					if (item instanceof Expression) {
						const value = await item.get(operationContext);
						return value.toTruthy();
					} else if (item instanceof Operation) {
						const value = await item.get(operationContext);
						return value.toTruthy();
					} else if (isCustomValue(item)) {
						return item.toTruthy();
					}
					
					operationContext.debugger.raise('Unexpected condition', me, item);
				};

				if (await resolveCondition(condition)) {
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