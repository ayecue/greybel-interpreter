import {
	ASTBase,
	Parser as CodeParser
} from 'greybel-core';
import CustomMap from '../custom-types/map';
import CustomNil from '../custom-types/nil';
import { Expression } from '../types/expression';
import { OperationContext, ContextType, ContextState } from '../context';

export class ExpressionSegment {
	namespace: any;
	body: any;

	constructor(namespace: any, body: any) {
		const me = this;
		me.namespace = namespace;
		me.body = body;
	}
}

export default class ImportExpression extends Expression {
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

	async prepare(visit: Function): Promise<ImportExpression> {
		const me = this;
		const node = me.ast;
		const parser = new CodeParser(me.code);
		const chunk = parser.parseChunk();

		me.expr = new ExpressionSegment(
			await visit(me.ast.name),
			await visit(chunk)
		);

		return me;
	}

	async get(operationContext: OperationContext, parentExpr: any): Promise<any> {
		const me = this;
		const evaluate = async function(node: ExpressionSegment): Promise<any> {
			const namespace = await node.namespace.get(operationContext, me.expr);
			const opc = operationContext.fork({
				type: ContextType.EXTERNAL,
				state: ContextState.DEFAULT,
				target: me.target
			});
			const moduleExports = new CustomMap(
				new Map([
					['exports', new CustomNil()]
				])
			);

			await opc.set(['module'], moduleExports);
			await node.body.run(opc);

			const defaultExport = await moduleExports.get(['exports'])

			await operationContext.set(namespace.path, defaultExport);

			return true;
		};

		operationContext.debugger.debug('ImportExpression', 'get', 'expr', me.expr);

		return await evaluate(me.expr);
	}
}