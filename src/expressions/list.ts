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

	constructor(ast: ASTListConstructorExpression) {
		super();
		const me = this;

		me.ast = ast;
		me.expr = null;
	}

	async prepare(visit: Function): Promise<ListExpression> {
		const me = this;
		const node = me.ast;

		me.expr = new ExpressionSegment(
			await Promise.all(node.fields.map((item: ASTListValue) => {
				return visit(item.value);
			}))
		);

		return me;
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

		operationContext.debugger.debug('Line', me.ast.line, 'ListExpression', 'get', 'expr', me.expr);

		return evaluate(me.expr.values);
	}
}