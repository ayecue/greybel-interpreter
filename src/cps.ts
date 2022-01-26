import {
	ASTBase,
	ASTReturnStatement,
	ASTIfStatement,
	ASTIfClause,
	ASTElseClause,
	ASTWhileStatement,
	ASTAssignmentStatement,
	ASTCallStatement,
	ASTFunctionStatement,
	ASTForGenericStatement,
	ASTChunk,
	ASTIdentifier,
	ASTLiteral,
	ASTMemberExpression,
	ASTCallExpression,
	ASTComment,
	ASTUnaryExpression,
	ASTMapKeyString,
	ASTMapConstructorExpression,
	ASTListValue,
	ASTListConstructorExpression,
	ASTIndexExpression,
	ASTEvaluationExpression,
	ASTSliceExpression,
	ASTImportCodeExpression,
	ASTFeatureIncludeExpression,
	ASTFeatureImportExpression
} from 'greybel-core';
import AssignExpression from './expressions/assign';
import CallExpression from './expressions/call';
import ListExpression from './expressions/list';
import LogicalAndBinaryExpression from './expressions/logical-and-binary';
import MapExpression from './expressions/map';
import PathExpression from './expressions/path';
import BinaryNegatedExpression from './expressions/binary-negated-expression';
import IncludeExpression from './expressions/include';
import ImportExpression from './expressions/import';
import ArgumentOperation from './operations/argument';
import WhileOperation from './operations/while';
import ForOperation from './operations/for';
import ReturnOperation from './operations/return';
import ReferenceOperation from './operations/reference';
import NewOperation from './operations/new';
import NotOperation from './operations/not';
import IfStatementOperation from './operations/if-statement';
import IfOperation from './operations/if';
import ElseIfOperation from './operations/else-if';
import ElseOperation from './operations/else';
import ContinueOperation from './operations/continue';
import BreakOperation from './operations/break';
import BodyOperation from './operations/body';
import DebuggerOperation from './operations/debugger';
import FunctionOperation from './operations/function';
import CustomBoolean from './custom-types/boolean';
import CustomNumber from './custom-types/number';
import CustomString from './custom-types/string';
import CustomNil from './custom-types/nil';
import { ResourceHandler } from './resource';
import { Expression } from './types/expression';
import { Operation } from './types/operation';

export interface CPSMapType {
	[key: string]: (item: ASTBase) => any;
}

export interface CPSMapContext {
	target: string;
	resourceHandler: ResourceHandler;
	currentTarget?: string;
}

export const CPSMap = function(visit: (o: ASTBase) => any, context: CPSMapContext): CPSMapType {
	return {
		'AssignmentStatement': function(item: ASTAssignmentStatement): Promise<AssignExpression> {
			return new AssignExpression(item).prepare(visit);
		},
		'MemberExpression': function(item: ASTMemberExpression): Promise<PathExpression> {
			return new PathExpression(item).prepare(visit);
		},
		'FunctionDeclaration': async function(item: ASTFunctionStatement): Promise<FunctionOperation> {
			const args = new ArgumentOperation(item.parameters);
			const body = new BodyOperation(item.body);

			for (let parameterItem of item.parameters) {
				args.stack.push(await visit(parameterItem));
			}

			for (let bodyItem of item.body) {
				body.stack.push(await visit(bodyItem));
			}

			return new FunctionOperation(item, {
				args,
				body
			});
		},
		'MapConstructorExpression': function(item: ASTMapConstructorExpression): Promise<MapExpression> {
			return new MapExpression(item).prepare(visit);
		},
		'Identifier': function(item: ASTIdentifier): Promise<PathExpression> {
			return new PathExpression(item).prepare(visit);
		},
		'ReturnStatement': async function(item: ASTReturnStatement): Promise<ReturnOperation> {
			const arg = await visit(item.argument);

			return new ReturnOperation(item, {
				arg
			});
		},
		'NumericLiteral': function(item: ASTLiteral): Promise<CustomNumber> {
			return Promise.resolve(
				// @ts-ignore: Key is always a literal
				new CustomNumber(item.value)
			);
		},
		'WhileStatement': async function(item: ASTWhileStatement): Promise<WhileOperation> {
			const body = new BodyOperation(item.body);
			const condition = await visit(item.condition);

			for (let bodyItem of item.body) {
				body.stack.push(await visit(bodyItem));
			}

			return new WhileOperation(item, {
				body,
				condition
			});
		},
		'StringLiteral': function(item: ASTLiteral): Promise<CustomString> {
			return Promise.resolve(
				// @ts-ignore: Key is always a literal
				new CustomString(item.value)
			);
		},
		'IndexExpression': function(item: ASTIndexExpression): Promise<PathExpression> {
			return new PathExpression(item).prepare(visit);
		},
		'FeatureEnvarExpression': function(_item: ASTBase) {
			throw new Error('Not supported');
		},
		'IfShortcutStatement': async function(item: ASTIfStatement): Promise<IfStatementOperation> {
			const op = new IfStatementOperation(item);

			for (let clausesItem of item.clauses) {
				op.clauses.push(await visit(clausesItem));
			}

			return op;
		},
		'IfShortcutClause': async function(item: ASTIfClause): Promise<IfOperation> {
			const body = new BodyOperation(item.body);
			const condition = await visit(item.condition);

			for (let bodyItem of item.body) {
				body.stack.push(await visit(bodyItem));
			}

			return new IfOperation(item, {
				condition,
				body
			});
		},
		'ElseifShortcutClause': async function(item: ASTIfClause): Promise<ElseIfOperation> {
			const body = new BodyOperation(item.body);
			const condition = await visit(item.condition);

			for (let bodyItem of item.body) {
				body.stack.push(await visit(bodyItem));
			}

			return new ElseIfOperation(item, {
				body,
				condition
			});
		},
		'ElseShortcutClause': async function(item: ASTElseClause): Promise<ElseOperation> {
			const body = new BodyOperation(item.body);

			for (let bodyItem of item.body) {
				body.stack.push(await visit(bodyItem));
			}

			return new ElseOperation(item, {
				body
			});
		},
		'NilLiteral': function(item: ASTLiteral): Promise<CustomNil> {
			return Promise.resolve(
				new CustomNil()
			);
		},
		'ForGenericStatement': async function(item: ASTForGenericStatement): Promise<ForOperation> {
			const body = new BodyOperation(item.body);
			const variable = await visit(item.variable);
			const iterator = await visit(item.iterator);

			for (let bodyItem of item.body) {
				body.stack.push(await visit(bodyItem));
			}

			return new ForOperation(item, {
				body,
				variable,
				iterator
			});
		},
		'IfStatement': async function(item: ASTIfStatement): Promise<IfStatementOperation> {
			const op = new IfStatementOperation(item);

			for (let clausesItem of item.clauses) {
				op.clauses.push(await visit(clausesItem));
			}

			return op;
		},
		'IfClause': async function(item: ASTIfClause): Promise<IfOperation> {
			const body = new BodyOperation(item.body);
			const condition = await visit(item.condition);

			for (let bodyItem of item.body) {
				body.stack.push(await visit(bodyItem));
			}

			return new IfOperation(item, {
				body,
				condition
			});
		},
		'ElseifClause': async function(item: ASTIfClause): Promise<ElseIfOperation> {
			const body = new BodyOperation(item.body);
			const condition = await visit(item.condition);

			for (let bodyItem of item.body) {
				body.stack.push(await visit(bodyItem));
			}

			return new ElseIfOperation(item, {
				body,
				condition
			});
		},
		'ElseClause': async function(item: ASTElseClause): Promise<ElseOperation> {
			const body = new BodyOperation(item.body);

			for (let bodyItem of item.body) {
				body.stack.push(await visit(bodyItem));
			}

			return new ElseOperation(item, {
				body
			});
		},
		'NegationExpression': async function(item: ASTUnaryExpression): Promise<NotOperation> {
			const arg = await visit(item.argument);

			return new NotOperation(item, { arg });
		},
		'ContinueStatement': function(item: ASTBase): Promise<ContinueOperation> {
			return Promise.resolve(
				new ContinueOperation(item)
			);
		},
		'BreakStatement': function(item: ASTBase): Promise<BreakOperation> {
			return Promise.resolve(
				new BreakOperation(item)
			);
		},
		'CallExpression': function(item: ASTCallExpression): Promise<CallExpression> {
			return new CallExpression(item).prepare(visit);
		},
		'CallStatement': function(item: ASTCallStatement): Promise<CallExpression> {
			return visit(item.expression);
		},
		'FeatureImportExpression': async function(item: ASTFeatureImportExpression): Promise<ImportExpression> {
			const resourceHandler = context.resourceHandler;
			const target = await resourceHandler.getTargetRelativeTo(
				context.target,
				// @ts-ignore: FileSystemDirectory is always a string
				item.path
			);
			const code = await context.resourceHandler.get(target);

			context.currentTarget = target;
			const chunk = await (new ImportExpression(item, target, code).prepare(visit));
			context.currentTarget = context.target;

			return chunk;
		},
		'FeatureIncludeExpression': async function(item: ASTFeatureIncludeExpression): Promise<IncludeExpression> {
			const resourceHandler = context.resourceHandler;
			const target = await resourceHandler.getTargetRelativeTo(
				context.target,
				// @ts-ignore: FileSystemDirectory is always a string
				item.path
			);
			const code = await context.resourceHandler.get(target);

			context.currentTarget = target;
			const chunk = await (new IncludeExpression(item, target, code).prepare(visit));
			context.currentTarget = context.target;

			return chunk;
		},
		'ImportCodeExpression': async function(item: ASTImportCodeExpression): Promise<IncludeExpression> {
			const resourceHandler = context.resourceHandler;
			const target = await resourceHandler.getTargetRelativeTo(
				context.target,
				// @ts-ignore: FileSystemDirectory is always a string
				item.fileSystemDirectory
			);
			const code = await context.resourceHandler.get(target);

			context.currentTarget = target;
			const chunk = await (new IncludeExpression(item, target, code).prepare(visit));
			context.currentTarget = context.target;

			return chunk;
		},
		'FeatureDebuggerExpression': function(item: ASTBase): Promise<DebuggerOperation> {
			return Promise.resolve(
				new DebuggerOperation(item)
			);
		},
		'ListConstructorExpression': function(item: ASTListConstructorExpression): Promise<ListExpression> {
			return new ListExpression(item).prepare(visit);
		},
		'BooleanLiteral': function(item: ASTLiteral): Promise<CustomBoolean> {
			return Promise.resolve(
				// @ts-ignore: Key is always a literal
				new CustomBoolean(item.value)
			);
		},
		'EmptyExpression': function(item: ASTBase) {},
		'BinaryExpression': function(item: ASTEvaluationExpression): Promise<LogicalAndBinaryExpression> {
			return new LogicalAndBinaryExpression(item).prepare(visit);
		},
		'BinaryNegatedExpression': function(item: ASTUnaryExpression): Promise<BinaryNegatedExpression> {
			return new BinaryNegatedExpression(item).prepare(visit);
		},
		'LogicalExpression': function(item: ASTEvaluationExpression): Promise<LogicalAndBinaryExpression> {
			return new LogicalAndBinaryExpression(item).prepare(visit);
		},
		'UnaryExpression': async function(item: ASTUnaryExpression): Promise<ReferenceOperation | NewOperation> {
			const arg = await visit(item.argument);
			let op;

			if ('@' === item.operator) {
				op = new ReferenceOperation(item, { arg });
			} else if ('new' === item.operator) {
				op = new NewOperation(item, { arg });
			} else {
				throw new Error('Unknown unary expression.');
			}

			return op;
		},
		'Chunk': async function(item: ASTChunk): Promise<BodyOperation> {
			const op = new BodyOperation(item.body);

			for (let bodyItem of item.body) {
				op.stack.push(await visit(bodyItem));
			}

			return op;
		}
	};
};

export default class CPS {
	cpsMap: CPSMapType;
	context: CPSMapContext;

	constructor(context: CPSMapContext) {
		const me = this;
		me.cpsMap = CPSMap(me.visit.bind(me), context);
		me.context = context;
		context.currentTarget = context.target;
	}

	async visit(o: ASTBase): Promise<any> {
		const me = this;
		if (o == null) return '';
		if (o.type == null) {
			console.error('Error ast type:', o);
			throw new Error('Unexpected as type');
		}
		const fn = me.cpsMap[o.type];
		if (fn == null) {
			console.error('Error ast:', o);
			throw new Error('Type does not exist ' + o.type);
		}
		const result = await fn.call(me, o);
		if (result instanceof Operation || result instanceof Expression) {
			result.target = me.context.currentTarget;
		}
		return result;
	}
}