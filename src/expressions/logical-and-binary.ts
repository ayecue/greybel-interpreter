import {
	ASTBase,
	ASTEvaluationExpression,
	Operator
} from 'greybel-core';
import { ASTType } from 'greyscript-core';
import { Expression } from '../types/expression';
import { OperationContext } from '../context';
import CustomList from '../custom-types/list';
import CustomMap from '../custom-types/map';
import {
	isCustomValue,
	cast,
	isCustomMap,
	isCustomList,
	isCustomString,
	isCustomNumber
} from '../typer';
import { CustomType } from '../types/custom-type';

export const toPrimitive = (v: CustomType | any): any => {
	return isCustomValue(v) ? v.valueOf() : v;
};

export const multiplyString = (a: CustomType, b: CustomType): string => {
	const aVal = a.valueOf() || '';
	const bVal = b.valueOf();

	return new Array(bVal)
		.fill(aVal)
		.join('');
};

export type OperationMap = {
	[key: string]: (a: CustomType, b: CustomType) => any
};

export const OPERATIONS: OperationMap = {
	[Operator.Plus]: (a: CustomType, b: CustomType): any => {
		if (isCustomMap(a) && isCustomMap(b)) {
			return (a as CustomMap).extend((b as CustomMap).value);
		} else if (isCustomList(a) && isCustomList(b)) {
			return (a as CustomList).concat(b as CustomList);
		}

		const aVal = isCustomString(a) ? (a.valueOf() || '') : toPrimitive(a);
		const bVal = isCustomString(b) ? (b.valueOf() || '') : toPrimitive(b);

		return aVal + bVal;
	},
	[Operator.Minus]: (a: CustomType, b: CustomType): any => toPrimitive(a) - toPrimitive(b),
	[Operator.Slash]: (a: CustomType, b: CustomType): any => toPrimitive(a) / toPrimitive(b),
	[Operator.Asterik]: (a: CustomType, b: CustomType): any => {
		if (isCustomString(a) && isCustomNumber(b)) {
			return multiplyString(a, b);
		} else if (isCustomString(b) && isCustomNumber(a)) {
			return multiplyString(b, a);
		}

		const aVal = toPrimitive(a);
		const bVal = toPrimitive(b);

		return aVal * bVal;
	},
	[Operator.Xor]: (a: CustomType, b: CustomType): any => toPrimitive(a) ^ toPrimitive(b),
	[Operator.BitwiseOr]: (a: CustomType, b: CustomType): any => toPrimitive(a) | toPrimitive(b),
	[Operator.LessThan]: (a: CustomType, b: CustomType): any => toPrimitive(a) < toPrimitive(b),
	[Operator.GreaterThan]: (a: CustomType, b: CustomType): any => toPrimitive(a) > toPrimitive(b),
	[Operator.LeftShift]: (a: CustomType, b: CustomType): any => toPrimitive(a) << toPrimitive(b),
	[Operator.RightShift]: (a: CustomType, b: CustomType): any => toPrimitive(a) >> toPrimitive(b),
	[Operator.UnsignedRightShift]: (a: CustomType, b: CustomType): any => toPrimitive(a) >>> toPrimitive(b),
	[Operator.BitwiseAnd]: (a: CustomType, b: CustomType): any => toPrimitive(a) & toPrimitive(b),
	[Operator.PercentSign]: (a: CustomType, b: CustomType): any => toPrimitive(a) % toPrimitive(b),
	[Operator.GreaterThanOrEqual]: (a: CustomType, b: CustomType): any => toPrimitive(a) >= toPrimitive(b),
	[Operator.Equal]: (a: CustomType, b: CustomType): any => toPrimitive(a) == toPrimitive(b),
	[Operator.LessThanOrEqual]: (a: CustomType, b: CustomType): any => toPrimitive(a) <= toPrimitive(b),
	[Operator.NotEqual]: (a: CustomType, b: CustomType): any => toPrimitive(a) != toPrimitive(b),
	[Operator.And]: (a: CustomType, b: CustomType): any => toPrimitive(a) && toPrimitive(b),
	[Operator.Or]: (a: CustomType, b: CustomType): any => toPrimitive(a) || toPrimitive(b)
};

export class ExpressionSegment {
	type: string;
	operator: string;
	left: any;
	right: any;

	constructor(type: string, operator: string, left: any, right: any) {
		const me = this;
		me.type = type;
		me.operator = operator;
		me.left = left;
		me.right = right;
	}
}

export default class LogicalAndBinaryExpression extends Expression {
	expr: ExpressionSegment;

	constructor(ast: ASTEvaluationExpression) {
		super();
		const me = this;

		me.ast = ast;
		me.expr = null;
	}

	async prepare(visit: Function): Promise<LogicalAndBinaryExpression> {
		const me = this;
		const node = me.ast;

		me.expr = new ExpressionSegment(
			node.type,
			node.operator,
			await visit(node.left),
			await visit(node.right)
		);

		return me;
	}

	async get(operationContext: OperationContext): Promise<any> {
		const me = this;
		const evaluate = async (node: any): Promise<any> => {
			if (isCustomValue(node)) {
				return node;
			} else if (node instanceof LogicalAndBinaryExpression) {
				const expr = (node as LogicalAndBinaryExpression).expr;

				if (!OPERATIONS[expr.operator]) {
					operationContext.debugger.raise('Unexpected expression type', me, expr);
				}

				switch(expr.type) {
					case ASTType.BinaryExpression:
						const binaryResult = OPERATIONS[expr.operator](
							await evaluate(expr.left),
							await evaluate(expr.right)
						);

						return Number.isNaN(binaryResult) ? null : binaryResult;
					case ASTType.LogicalExpression:
						let logicalLeft = await evaluate(expr.left);

						if (isCustomList(logicalLeft) && !logicalLeft.valueOf()) {
							logicalLeft = false;
						}

						if (expr.operator === Operator.And && !toPrimitive(logicalLeft)) {
							return false;
						} else if (expr.operator === Operator.Or && toPrimitive(logicalLeft)) {
							return true;
						}

						const logicalResult = OPERATIONS[expr.operator](
							logicalLeft,
							await evaluate(expr.right)
						);

						return logicalResult;
					default:
				}
			}

			return node.get(operationContext);
		};

		operationContext.debugger.debug('Line', me.ast.start.line, 'LogicalAndBinaryExpression', 'get', 'expr', me.expr);

		const result = await evaluate(me);

		return cast(result);
	}
}