import {
	ASTBase,
	Parser as CodeParser
} from 'greybel-core';
import { Expression } from '../types/expression';
import { OperationContext, ContextType, ContextState } from '../context';

export class ExpressionSegment {
	body: any;

	constructor(body: any) {
		const me = this;
		me.body = body;
	}
}

export default class IncludeExpression extends Expression {
	target: string;
	code: string;

	constructor(ast: any, target: string, code: string) {
		super();
		const me = this;

		me.ast = ast;
		me.expr = null;
		me.target = target;
		me.code = code;
	}

	async prepare(visit: Function): Promise<IncludeExpression> {
		const me = this;
		const node = me.ast;
		const parser = new CodeParser(me.code);
		const chunk = parser.parseChunk();

		me.expr = new ExpressionSegment(
			await visit(chunk)
		);

		return me;
	}

	async get(operationContext: OperationContext, parentExpr: any): Promise<any> {
		const me = this;
		const evaluate = async function(node: ExpressionSegment): Promise<any> {
			const opc = operationContext.fork({
				type: ContextType.EXTERNAL,
				state: ContextState.TEMPORARY,
				target: me.target
			});

			await node.body.run(opc);

			return true;
		};

		operationContext.debugger.debug('IncludeExpression', 'get', 'expr', me.expr);

		return await evaluate(me.expr);
	}
}