import {
	ASTBase,
	ASTUnaryExpression
} from 'greybel-core';
import { Expression } from '../types/expression';
import { OperationContext } from '../context';
import { isCustomValue, cast } from '../typer';

const toPrimitive = (v: any): any => {
	if (isCustomValue(v)) {
		return v.valueOf();
	}

	return v;
};

const OPERATIONS: { [key: string]: (a: any) => any } = {
	'+': (a: any): any => toPrimitive(a),
	'-': (a: any): any => -toPrimitive(a)
};

export default class BinaryNegatedExpression extends Expression {
	constructor(ast: ASTBase, visit: Function) {
		super();
		const me = this;
		const buildExpression = function(node: ASTBase): any {
			let expression;

			switch (node.type) {
				case 'BinaryNegatedExpression':
					const unaryExpression = <ASTUnaryExpression>node;
					expression = {
						type: unaryExpression.type,
						operator: unaryExpression.operator,
						arg: buildExpression(unaryExpression.argument)
					};
					break;
				default:
					const op = visit(node);
					expression = op;
			}

			return expression;
		};

		me.ast = ast;
		me.expr = buildExpression(ast);
	}

	get(operationContext: OperationContext): any {
		const me = this;
		const evaluate = async function(node: any): Promise<any> {
			switch(node.type) {
				case 'BinaryNegatedExpression':
					const arg = await evaluate(node.arg);

					return cast(OPERATIONS[node.operator](arg));
				default: 
			}

			if (isCustomValue(node)) {
				return node;
			}

			return node.get(operationContext);
		};

		operationContext.debugger.debug('BinaryNegatedExpression', 'get', 'expr', me.expr);

		return evaluate(me.expr);
	}
}