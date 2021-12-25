import {
	ASTBase,
	ASTCallStatement,
	ASTCallExpression
} from 'greybel-core';
import { Expression } from '../types/expression';
import { Operation } from '../types/operation';
import { isCustomValue, cast, isCustomMap } from '../typer';
import { OperationContext } from '../context';

export default class CallExpression extends Expression {
	constructor(ast: ASTBase, visit: Function) {
		super();
		const me = this;
		const buildExpression = function(node: ASTBase): any {
			let expression;
			let base;

			switch (node.type) {
				case 'CallStatement':
					const callStatement = <ASTCallStatement>node;
					expression = buildExpression(callStatement.expression);
					break;
				case 'CallExpression':
					const callExpression = <ASTCallExpression>node;
					expression = {
						type: 'call',
						path: buildExpression(callExpression.base),
						args: callExpression.arguments.map((arg) => {
							return visit(arg);
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
		const opc = operationContext.fork('CALL', 'TEMPORARY');
		const resolveArgs = function(...args: any[]) {
			return Promise.all(args.map(async (item: any): Promise<any> => {
				if (isCustomValue(item)) {
					return item;
				}
				return item.get(opc);
			}));
		};
		const evaluate = async function(node: any): Promise<any> {
			if (node instanceof Expression) {
				return node.get(opc);
			}

			const args = await resolveArgs(...node.args);

			if (node.path?.type === 'call') {
				const callResult = await evaluate(node.path);

				if (callResult instanceof Operation) {
					opc.setMemory('args', args);
					return callResult.run(opc);
				} else {
					operationContext.debugger.raise('Unexpected handle result', me, callResult);
				}
			}

			const pathExpr = await node.path.get(opc, me.expr);

			operationContext.debugger.debug('CallExpression', 'pathExpr', pathExpr);

			if (pathExpr.handle) {
				if (isCustomMap(pathExpr.handle)) {
					const callable = await pathExpr.handle.getCallable(pathExpr.path);

					if (callable.origin instanceof Operation) {
						opc.setMemory('args', args);
						return callable.origin.run(opc);
					} else if (callable.origin instanceof Function) {
						return callable.origin.call(pathExpr.handle, ...args);
					}

					operationContext.debugger.raise('Unexpected handle call', me, callable);
				}

				return cast(pathExpr.handle.callMethod(pathExpr.path, ...args));
			}
			
			const callable = await opc.getCallable(pathExpr.path);

			opc.setMemory('args', args);

			if (callable.origin instanceof Operation) {
				return callable.origin.run(opc);
			} else if (callable.origin instanceof Function) {
				return cast(await callable.origin.call(callable.context, ...args));
			}

			return cast(callable.origin);
		};

		operationContext.debugger.debug('CallExpression', 'get', 'expr', me.expr);

		return evaluate(me.expr);
	}
}