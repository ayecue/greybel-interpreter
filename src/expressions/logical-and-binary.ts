import {
	ASTBase,
	ASTEvaluationExpression
} from 'greybel-core';
import { Expression } from '../types/expression';
import { OperationContext } from '../context';
import {
	isCustomValue,
	cast,
	isCustomList,
	isCustomString,
	isCustomNumber
} from '../typer';

const toPrimitive = (v: any): any => {
	if (isCustomValue(v)) {
		return v.valueOf();
	}

	return v;
};

const multiplyString = (a: string, b: number): string => {
	a = a.valueOf() || '';
	b = b.valueOf();

	return new Array(b)
		.fill(a)
		.join('');
};

const OPERATIONS: { [key: string]: (a: any, b: any) => any } = {
	'+': (a: any, b: any): any => {
		if (isCustomList(a) || isCustomList(b)) {
			return a.concat(b);
		}

		if (isCustomString(a)) {
			a = a.valueOf() || '';
		} else {
			a = toPrimitive(a);
		}

		if (isCustomString(b)) {
			b = b.valueOf() || '';
		} else {
			b = toPrimitive(b);
		}

		return a + b;
	},
	'-': (a: any, b: any): any => toPrimitive(a) - toPrimitive(b),
	'/': (a: any, b: any): any => toPrimitive(a) / toPrimitive(b),
	'*': (a: any, b: any): any => {
		if (isCustomString(a) && isCustomNumber(b)) {
			return multiplyString(a, b);
		} else if (isCustomString(b) && isCustomNumber(a)) {
			return multiplyString(b, a);
		}

		a = toPrimitive(a);
		b = toPrimitive(b);

		return a * b;
	},
	'^': (a: any, b: any): any => toPrimitive(a) ^ toPrimitive(b),
	'|': (a: any, b: any): any => toPrimitive(a) | toPrimitive(b),
	'<': (a: any, b: any): any => toPrimitive(a) < toPrimitive(b),
	'>': (a: any, b: any): any => toPrimitive(a) > toPrimitive(b),
	'<<': (a: any, b: any): any => toPrimitive(a) << toPrimitive(b),
	'>>': (a: any, b: any): any => toPrimitive(a) >> toPrimitive(b),
	'>>>': (a: any, b: any): any => toPrimitive(a) >>> toPrimitive(b),
	'&': (a: any, b: any): any => toPrimitive(a) & toPrimitive(b),
	'%': (a: any, b: any): any => toPrimitive(a) % toPrimitive(b),
	'>=': (a: any, b: any): any => toPrimitive(a) >= toPrimitive(b),
	'==': (a: any, b: any): any => toPrimitive(a) == toPrimitive(b),
	'<=': (a: any, b: any): any => toPrimitive(a) <= toPrimitive(b),
	'!=': (a: any, b: any): any => toPrimitive(a) != toPrimitive(b),
	'and': (a: any, b: any): any => toPrimitive(a) && toPrimitive(b),
	'or': (a: any, b: any): any => toPrimitive(a) || toPrimitive(b)
};

export default class LogicalAndBinaryExpression extends Expression {
	constructor(ast: ASTBase, visit: Function) {
		super();
		const me = this;
		const buildExpression = function(node: ASTBase): any {
			let expression;

			switch (node.type) {
				case 'LogicalExpression':
				case 'BinaryExpression':
					const evaluationExpression = <ASTEvaluationExpression>node;

					expression = {
						type: evaluationExpression.type,
						operator: evaluationExpression.operator,
						left: buildExpression(evaluationExpression.left),
						right: buildExpression(evaluationExpression.right)
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
			let left;
			let right;

			switch(node.type) {
				case 'BinaryExpression':
					left = await evaluate(node.left);
					right = await evaluate(node.right);

					return cast(OPERATIONS[node.operator](left, right));
				case 'LogicalExpression':
					left = await evaluate(node.left);

					if (isCustomList(left) && !left.valueOf()) {
						left = false;
					}

					if (node.operator === 'and' && !toPrimitive(left)) {
						return false;
					} else if (node.operator === 'or' && toPrimitive(left)) {
						return true;
					}

					right = await evaluate(node.right);
					
					return OPERATIONS[node.operator](left, right);
				default: 
			}

			if (isCustomValue(node)) {
				return node;
			}

			return node.get(operationContext);
		};

		operationContext.debugger.debug('LogicalAndBinaryExpression', 'get', 'expr', me.expr);

		return evaluate(me.expr);
	}
}