import {
	ASTBase,
	ASTAssignmentStatement
} from 'greybel-core';
import { Operation, FunctionOperationBase } from '../types/operation';
import { Expression } from '../types/expression';
import { OperationContext } from '../context';
import { CustomObjectType } from '../types/custom-type';
import { isCustomValue, isCustomMap } from '../typer';

export class ExpressionSegment {
	left: any;
	right: any;

	constructor(left: any, right: any) {
		const me = this;
		me.left = left;
		me.right = right;
	}
}

export default class AssignExpression extends Expression {
	constructor(ast: ASTAssignmentStatement) {
		super();
		const me = this;

		me.ast = ast;
		me.expr = null;
	}

	async prepare(visit: Function): Promise<AssignExpression> {
		const me = this;
		const node = me.ast;

		me.expr = new ExpressionSegment(
			await visit(node.variable),
			await visit(node.init)
		);

		return me;
	}

	async get(operationContext: OperationContext, parentExpr: any): Promise<any> {
		const me = this;
		const evaluate = async function(node: ExpressionSegment): Promise<any> {
			if (!(node.left instanceof Expression)) {
				operationContext.debugger.raise('Unexpected left assignment', me, node.left);
			}

			const left = await node.left.get(operationContext, me.expr);

			let right = node.right;

			if (isCustomValue(right)) {
				right = right;
			} else if (node.right instanceof Expression) {
				right = await right.get(operationContext);
			} else if (node.right instanceof Operation) {
				right = await right.get(operationContext);

				const pathLength = left.path.length;

				if (right instanceof FunctionOperationBase && pathLength > 1) {
					const origin = await operationContext.get(left.path.slice(0, pathLength - 1));

					if (isCustomMap(origin)) {
						right = right.fork(origin);
					}
				}
			} else {
				operationContext.debugger.raise('Unexpected right assignment', me, right);
			}

			if (left.handle) {
				if (left.handle instanceof CustomObjectType) {
					const handlePath = left.path;
					const context = left.handle;
					
					await context.set(handlePath, right);

					return true;
				} else {
					operationContext.debugger.raise('Unexpected left assignment', me, left);
				}
			}

			await operationContext.set(left.path, right);

			return true;
		};

		operationContext.debugger.debug('AssignExpression', 'get', 'expr', me.expr);

		return await evaluate(me.expr);
	}
}