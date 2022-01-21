import {
	ASTBase,
	ASTCallStatement,
	ASTCallExpression
} from 'greybel-core';
import { ASTType } from 'greyscript-core';
import { Expression } from '../types/expression';
import { Operation } from '../types/operation';
import {
	isCustomValue,
	cast,
	isCustomMap
} from '../typer';
import { 
	OperationContext,
	ContextType,
	ContextState
} from '../context';

export class ExpressionSegment {
	path: any;
	args: any[];

	constructor(path: any, args: any[]) {
		const me = this;
		me.path = path;
		me.args = args;
	}

	resolveArgs(operationContext: OperationContext): Promise<any> {
		const me = this;

		return Promise.all(me.args.map(async (item: any): Promise<any> => {
			if (isCustomValue(item)) {
				return item;
			}
			return item.get(operationContext);
		}));
	}
}

export default class CallExpression extends Expression {
	expr: ExpressionSegment;

	constructor(ast: any) {
		super();
		const me = this;

		me.ast = ast;
		me.expr = null;
	}

	async prepare(visit: Function): Promise<CallExpression> {
		const me = this;
		const buildExpression = async function(node: any): Promise<ExpressionSegment> {
			return new ExpressionSegment(
				await visit(node.base),
				await Promise.all(node.arguments.map((item: ASTBase) => visit(item)))
			);
		};

		me.expr = await buildExpression(me.ast);

		return me;
	}

	get(operationContext: OperationContext, parentExpr: any): Promise<any> {
		const me = this;
		const opc = operationContext.fork({
			type: ContextType.CALL,
			state: ContextState.TEMPORARY
		});
		const evaluate = async function(node: ExpressionSegment): Promise<any> {
			if (node instanceof Expression) {
				return node.get(opc);
			}

			const args = await node.resolveArgs(operationContext);
			const pathExpr = await node.path.get(opc, me.expr);

			operationContext.debugger.debug('Line', me.ast.start.line, 'CallExpression', 'pathExpr', pathExpr);

			if (pathExpr.handle) {
				if (isCustomMap(pathExpr.handle)) {
					const callable = await pathExpr.handle.getCallable(pathExpr.path);

					if (callable.origin instanceof Operation) {
						opc.setMemory('args', args);
						return callable.origin.run(opc);
					} else if (callable.origin instanceof Function) {
						return cast(await callable.origin.call(pathExpr.handle, ...args));
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

		operationContext.debugger.debug('Line', me.ast.start.line, 'CallExpression', 'get', 'expr', me.expr);

		return evaluate(me.expr);
	}
}