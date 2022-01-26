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

export const multiplyString = (a: CustomType, b: CustomType): string => {
	const aVal = a.toString();
	const bVal = b.toNumber();

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
		} else if (isCustomString(a) || isCustomString(b)) {
			return a.toString() + b.toString();
		}

		return a.toNumber() + b.toNumber();
	},
	[Operator.Minus]: (a: CustomType, b: CustomType): number => a.toNumber() - b.toNumber(),
	[Operator.Slash]: (a: CustomType, b: CustomType): number => a.toNumber() / b.toNumber(),
	[Operator.Asterik]: (a: CustomType, b: CustomType): number | string => {
		if (isCustomString(a) && isCustomNumber(b)) {
			return multiplyString(a, b);
		} else if (isCustomString(b) && isCustomNumber(a)) {
			return multiplyString(b, a);
		}

		return a.toNumber() * b.toNumber();
	},
	[Operator.Xor]: (a: CustomType, b: CustomType): number => a.toNumber() ^ b.toNumber(),
	[Operator.BitwiseOr]: (a: CustomType, b: CustomType): number => a.toNumber() | b.toNumber(),
	[Operator.LessThan]: (a: CustomType, b: CustomType): boolean => a.toNumber() < b.toNumber(),
	[Operator.GreaterThan]: (a: CustomType, b: CustomType): boolean => a.toNumber() > b.toNumber(),
	[Operator.LeftShift]: (a: CustomType, b: CustomType): number => a.toNumber() << b.toNumber(),
	[Operator.RightShift]: (a: CustomType, b: CustomType): number => a.toNumber() >> b.toNumber(),
	[Operator.UnsignedRightShift]: (a: CustomType, b: CustomType): number => a.toNumber() >>> b.toNumber(),
	[Operator.BitwiseAnd]: (a: CustomType, b: CustomType): number => a.toNumber() & b.toNumber(),
	[Operator.PercentSign]: (a: CustomType, b: CustomType): number => a.toNumber() % b.toNumber(),
	[Operator.GreaterThanOrEqual]: (a: CustomType, b: CustomType): boolean => a.toNumber() >= b.toNumber(),
	[Operator.Equal]: (a: CustomType, b: CustomType): boolean => a.toNumber() == b.toNumber(),
	[Operator.LessThanOrEqual]: (a: CustomType, b: CustomType): boolean => a.toNumber() <= b.toNumber(),
	[Operator.NotEqual]: (a: CustomType, b: CustomType): boolean => a.toNumber() != b.toNumber(),
	[Operator.And]: (a: CustomType, b: CustomType): boolean => a.toTruthy() && b.toTruthy(),
	[Operator.Or]: (a: CustomType, b: CustomType): boolean => a.toTruthy() || b.toTruthy()
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
							cast(await evaluate(expr.left)),
							cast(await evaluate(expr.right))
						);

						return binaryResult;
					case ASTType.LogicalExpression:
						let logicalLeft = cast(await evaluate(expr.left));

						if (expr.operator === Operator.And && !logicalLeft.toTruthy()) {
							return false;
						} else if (expr.operator === Operator.Or && logicalLeft.toTruthy()) {
							return true;
						}

						const logicalResult = OPERATIONS[expr.operator](
							logicalLeft,
							cast(await evaluate(expr.right))
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