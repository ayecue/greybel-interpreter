import {
	ASTBase,
	ASTMapConstructorExpression,
	ASTMapKeyString
} from 'greybel-core';
import { Expression } from '../types/expression';
import CustomMap from '../custom-types/map';
import { OperationContext } from '../context';
import { isCustomValue } from '../typer';

export default class MapExpression extends Expression {
	constructor(ast: ASTBase, visit: Function) {
		super();
		const me = this;
		const buildExpression = function(node: ASTBase): any {
			let expression;

			switch (node.type) {
				case 'MapConstructorExpression':
					const mapExpression = <ASTMapConstructorExpression>node;

					expression = {
						type: 'map',
						values: mapExpression.fields.map((item: ASTMapKeyString) => {
							return {
								key: visit(item.key),
								value: visit(item.value)
							};
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
		const evaluate = async function(node: any[]): Promise<CustomMap> {
			const traverselPath = [].concat(node);
			const map = {};
			let current: any;

			while (current = traverselPath.shift()) {
				let key: string | number;
				let value: any;

				if (isCustomValue(current.key)) {
					key = current.key.valueOf();
				} else {
					operationContext.debugger.raise('Unexpected key', me, current.key);
				}

				if (isCustomValue(current.value)) {
					value = current.value;
				} else if (current.value instanceof Expression) {
					value = await current.value.get(operationContext);
				} else {
					operationContext.debugger.raise('Unexpected value', me, current.value);
				}

				// @ts-ignore: Key is always a literal
				map[key] = value;
			}

			return new CustomMap(map);
		};

		operationContext.debugger.debug('MapExpression', 'get', 'expr', me.expr);

		return evaluate(me.expr.values);
	}
}