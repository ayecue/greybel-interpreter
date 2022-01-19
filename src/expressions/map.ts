import {
	ASTBase,
	ASTMapConstructorExpression,
	ASTMapKeyString
} from 'greybel-core';
import { Expression } from '../types/expression';
import CustomMap from '../custom-types/map';
import { OperationContext } from '../context';
import { isCustomValue } from '../typer';

export class ValuesSegment {
	key: any;
	value: any;

	constructor(key: any, value: any) {
		const me = this;
		me.key = key;
		me.value = value;
	}
}

export class ExpressionSegment {
	values: ValuesSegment[];

	constructor(values: ValuesSegment[]) {
		this.values = values;
	}
}

export default class MapExpression extends Expression {
	expr: ExpressionSegment;

	constructor(ast: ASTMapConstructorExpression) {
		super();
		const me = this;

		me.ast = ast;
		me.expr = null;
	}

	async prepare(visit: Function): Promise<MapExpression> {
		const me = this;
		const node = me.ast;

		me.expr = new ExpressionSegment(
			await Promise.all(node.fields.map(async (item: ASTMapKeyString) => {
				return {
					key: await visit(item.key),
					value: await visit(item.value)
				};
			}))
		);

		return me;
	}


	get(operationContext: OperationContext, parentExpr: any): Promise<CustomMap> {
		const me = this;
		const evaluate = async function(values: ValuesSegment[]): Promise<CustomMap> {
			const map = new Map();

			for (let current of values) {
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
				map.set(key, value);
			}

			return new CustomMap(map);
		};

		operationContext.debugger.debug('Line', me.ast.start.line, 'MapExpression', 'get', 'expr', me.expr);

		return evaluate(me.expr.values);
	}
}