import {
	ASTBase,
	ASTListConstructorExpression,
	ASTListValue
} from 'greybel-core';
import { Expression } from '../types/expression';
import CustomList from '../custom-types/list';
import { isCustomValue } from '../typer';
import { OperationContext } from '../context';

export default class ListExpression extends Expression {
	constructor(ast: ASTBase, visit: Function) {
		super();
		const me = this;
		const buildExpression = function(node: ASTBase): any {
			let expression;

			switch (node.type) {
				case 'ListConstructorExpression':
					const listExpression = <ASTListConstructorExpression>node;

					expression = {
						type: 'list',
						values: listExpression.fields.map((item: ASTListValue) => {
							return visit(item.value);
						})
					};
					break;
				default:
					expression = visit(node);
			}

			return expression;
		};

		me.ast = ast;
		me.expr = buildExpression(ast);
	}

	get(operationContext: OperationContext, parentExpr: any): any {
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