import {
	ASTBase,
	ASTUnaryExpression,
	Operator
} from 'greybel-core';
import { Expression } from '../types/expression';
import { OperationContext } from '../context';
import { isCustomValue, cast } from '../typer';
import { CustomType } from '../types/custom-type';

export const toPrimitive = (v: CustomType | any): any => {
	return isCustomValue(v) ? v.valueOf() : v;
};

export type OperationMap = {
	[key: string]: (a: CustomType) => any
};

const OPERATIONS: OperationMap = {
	[Operator.Plus]: (a: CustomType): any => toPrimitive(a),
	[Operator.Minus]: (a: CustomType): any => -toPrimitive(a)
};

export class ExpressionSegment {
	operator: string;
	arg: any;

	constructor(operator: string, arg: any) {
		const me = this;
		me.operator = operator;
		me.arg = arg;
	}
}

export default class BinaryNegatedExpression extends Expression {
	expr: ExpressionSegment;

	constructor(ast: ASTUnaryExpression, visit: Function) {
		super();
		const me = this;
		const buildExpression = function(node: ASTUnaryExpression): ExpressionSegment {
			return new ExpressionSegment(
				node.operator,
				visit(node.argument)
			);
		};

		me.ast = ast;
		me.expr = buildExpression(ast);
	}

	get(operationContext: OperationContext): any {
		const me = this;
		const evaluate = async function(node: ExpressionSegment): Promise<any> {
			const arg = isCustomValue(node.arg)
				? node.arg
				: await node.arg.get(operationContext);

			return cast(OPERATIONS[node.operator](arg));
		};

		operationContext.debugger.debug('BinaryNegatedExpression', 'get', 'expr', me.expr);

		return evaluate(me.expr);
	}
}