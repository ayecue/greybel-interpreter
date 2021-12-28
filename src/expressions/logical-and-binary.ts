import {
	ASTBase,
	ASTEvaluationExpression,
	Operator
} from 'greybel-core';
import { ASTType } from 'greyscript-core';
import { Expression } from '../types/expression';
import { OperationContext } from '../context';
import CustomList from '../custom-types/list';
import {
	isCustomValue,
	cast,
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
		if (isCustomList(a) || isCustomList(b)) {
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

	constructor(ast: ASTEvaluationExpression, visit: Function) {
		super();
		const me = this;
		const buildExpression = function(node: ASTEvaluationExpression): ExpressionSegment | any {
			return new ExpressionSegment(
				node.type,
				node.operator,
				visit(node.left),
				visit(node.right)
			);
		};

		me.ast = ast;
		me.expr = buildExpression(ast);
	}

	get(operationContext: OperationContext): Promise<any> {
		const me = this;
		const resolve = (value: any): Promise<any> => {
			if (isCustomValue(value)) {
				return value;
			}

			return value.get(operationContext);
		};
		const evaluate = async (node: ExpressionSegment): Promise<any> => {
			let left;
			let right;

			switch(node.type) {
				case ASTType.BinaryExpression:
					left = await resolve(node.left);
					right = await resolve(node.right);

					return cast(OPERATIONS[node.operator](left, right));
				case ASTType.LogicalExpression:
					left = await resolve(node.left);

					if (isCustomList(left) && !left.valueOf()) {
						left = false;
					}

					if (node.operator === Operator.And && !toPrimitive(left)) {
						return false;
					} else if (node.operator === Operator.Or && toPrimitive(left)) {
						return true;
					}

					right = await resolve(node.right);
					
					return OPERATIONS[node.operator](left, right);
				default:
					operationContext.debugger.raise('Unexpected expression type', me, node);
			}
		};

		operationContext.debugger.debug('LogicalAndBinaryExpression', 'get', 'expr', me.expr);

		return evaluate(me.expr);
	}
}