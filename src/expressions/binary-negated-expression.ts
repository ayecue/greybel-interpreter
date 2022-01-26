import {
	ASTBase,
	ASTUnaryExpression,
	Operator
} from 'greybel-core';
import { Expression } from '../types/expression';
import { OperationContext } from '../context';
import { isCustomValue, cast } from '../typer';
import { CustomType } from '../types/custom-type';

export type OperationMap = {
	[key: string]: (a: CustomType) => any
};

const OPERATIONS: OperationMap = {
	[Operator.Plus]: (a: CustomType): any => a.toNumber(),
	[Operator.Minus]: (a: CustomType): any => -a.toNumber()
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

	constructor(ast: ASTUnaryExpression) {
		super();
		const me = this;

		me.ast = ast;
		me.expr = null;
	}

	async prepare(visit: Function): Promise<BinaryNegatedExpression> {
		const me = this;
		const node = me.ast;

		me.expr = new ExpressionSegment(
			node.operator,
			await visit(node.argument)
		);

		return me;
	}

	get(operationContext: OperationContext): any {
		const me = this;
		const evaluate = async function(node: ExpressionSegment): Promise<any> {
			const arg = isCustomValue(node.arg)
				? node.arg
				: await node.arg.get(operationContext);

			return cast(OPERATIONS[node.operator](arg));
		};

		operationContext.debugger.debug('Line', me.ast.start.line, 'BinaryNegatedExpression', 'get', 'expr', me.expr);

		return evaluate(me.expr);
	}
}