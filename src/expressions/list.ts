import {
	ASTBase,
	ASTListConstructorExpression,
	ASTListValue
} from 'greybel-core';
import { Expression } from '../types/expression';
import CustomList from '../custom-types/list';
import { isCustomValue } from '../typer';
import { OperationContext } from '../context';

export class ExpressionSegment {
	values: any[];

	constructor(values: any[]) {
		this.values = values;
	}
}

export default class ListExpression extends Expression {
	expr: ExpressionSegment;

	constructor(ast: ASTListConstructorExpression, visit: Function) {
		super();
		const me = this;
		const buildExpression = function(node: ASTListConstructorExpression): ExpressionSegment {
			return new ExpressionSegment(
				node.fields.map((item: ASTListValue) => {
					return visit(item.value);
				})
			);
		};

		me.ast = ast;
		me.expr = buildExpression(ast);
	}

	get(operationContext: OperationContext, parentExpr: any): Promise<CustomList> {
		const me = this;
		const evaluate = async function(node: any[]): Promise<CustomList> {
			const traverselPath = [].concat(node);
			const list = [];
			let current;

			while (current = traverselPath.shift()) {
				if (isCustomValue(current)) {
					list.push(current);
				} else if (current instanceof Expression) {
					list.push(await current.get(operationContext));
				} else {
					operationContext.debugger.raise('Unexpected handle', me, current);
				}
			}

			return new CustomList(list);
		};

		operationContext.debugger.debug('ListExpression', 'get', 'expr', me.expr);

		return evaluate(me.expr.values);
	}
}