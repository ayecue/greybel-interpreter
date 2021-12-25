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
	Parser as CodeParser
} from 'greybel-core';
import AssignExpression from './expressions/assign';
import CallExpression from './expressions/call';
import ListExpression from './expressions/list';
import LogicalAndBinaryExpression from './expressions/logical-and-binary';
import MapExpression from './expressions/map';
import PathExpression from './expressions/path';
import BinaryNegatedExpression from './expressions/binary-negated-expression';
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
import TopOperation from './operations/top';
import DebuggerOperation from './operations/debugger';
import FunctionOperation from './operations/function';
import CustomBoolean from './custom-types/boolean';
import CustomNumber from './custom-types/number';
import CustomString from './custom-types/string';
import CustomNil from './custom-types/nil';
import { ResourceHandler } from './resource';

export interface CPSMapType {
	[key: string]: (item: ASTBase) => any;
}

export interface CPSMapContext {
	target: string;
	resourceHandler: ResourceHandler;
}

export const CPSMap = function(visit: (o: ASTBase) => any, context: CPSMapContext): CPSMapType {
	return {
		'AssignmentStatement': function(item: ASTAssignmentStatement): AssignExpression {
			return new AssignExpression(item, visit);
		},
		'MemberExpression': function(item: ASTMemberExpression): PathExpression {
			return new PathExpression(item, visit);
		},
		'FunctionDeclaration': function(item: ASTFunctionStatement): FunctionOperation {
			const args = new ArgumentOperation(item.parameters);
			const body = new BodyOperation(item.body);

			for (let parameterItem of item.parameters) {
				args.stack.push(visit(parameterItem));
			}

			for (let bodyItem of item.body) {
				body.stack.push(visit(bodyItem));
			}

			return new FunctionOperation(item, {
				args,
				body
			});
		},
		'MapConstructorExpression': function(item: ASTMapConstructorExpression): MapExpression {
			return new MapExpression(item, visit);
		},
		'Identifier': function(item: ASTIdentifier): PathExpression {
			return new PathExpression(item, visit);
		},
		'ReturnStatement': function(item: ASTReturnStatement): ReturnOperation {
			const arg = visit(item.argument);

			return new ReturnOperation(item, {
				arg
			});
		},
		'NumericLiteral': function(item: ASTLiteral): CustomNumber {
			// @ts-ignore: Key is always a literal
			return new CustomNumber(item.value);
		},
		'WhileStatement': function(item: ASTWhileStatement): WhileOperation {
			const body = new BodyOperation(item.body);
			const condition = visit(item.condition);

			for (let bodyItem of item.body) {
				body.stack.push(visit(bodyItem));
			}

			return new WhileOperation(item, {
				body,
				condition
			});
		},
		'StringLiteral': function(item: ASTLiteral): CustomString {
			// @ts-ignore: Key is always a literal
			return new CustomString(item.value);
		},
		'IndexExpression': function(item: ASTIndexExpression): PathExpression {
			return new PathExpression(item, visit);
		},
		'FeatureEnvarExpression': function(_item: ASTBase) {
			throw new Error('Not supported');
		},
		'IfShortcutStatement': function(item: ASTIfStatement): IfStatementOperation {
			const op = new IfStatementOperation(item);

			for (let clausesItem of item.clauses) {
				op.clauses.push(visit(clausesItem));
			}

			return op;
		},
		'IfShortcutClause': function(item: ASTIfClause): IfOperation {
			const body = new BodyOperation(item.body);
			const condition = visit(item.condition);

			for (let bodyItem of item.body) {
				body.stack.push(visit(bodyItem));
			}

			return new IfOperation(item, {
				condition,
				body
			});
		},
		'ElseifShortcutClause': function(item: ASTIfClause): ElseIfOperation {
			const body = new BodyOperation(item.body);
			const condition = visit(item.condition);

			for (let bodyItem of item.body) {
				body.stack.push(visit(bodyItem));
			}

			return new ElseIfOperation(item, {
				body,
				condition
			});
		},
		'ElseShortcutClause': function(item: ASTElseClause): ElseOperation {
			const body = new BodyOperation(item.body);

			for (let bodyItem of item.body) {
				body.stack.push(visit(bodyItem));
			}

			return new ElseOperation(item, {
				body
			});
		},
		'NilLiteral': function(item: ASTLiteral): CustomNil {
			return new CustomNil();
		},
		'ForGenericStatement': function(item: ASTForGenericStatement): ForOperation {
			const body = new BodyOperation(item.body);
			const variable = visit(item.variable);
			const iterator = visit(item.iterator);

			for (let bodyItem of item.body) {
				body.stack.push(visit(bodyItem));
			}

			return new ForOperation(item, {
				body,
				variable,
				iterator
			});
		},
		'IfStatement': function(item: ASTIfStatement): IfStatementOperation {
			const op = new IfStatementOperation(item);

			for (let clausesItem of item.clauses) {
				op.clauses.push(visit(clausesItem));
			}

			return op;
		},
		'IfClause': function(item: ASTIfClause): IfOperation {
			const body = new BodyOperation(item.body);
			const condition = visit(item.condition);

			for (let bodyItem of item.body) {
				body.stack.push(visit(bodyItem));
			}

			return new IfOperation(item, {
				body,
				condition
			});
		},
		'ElseifClause': function(item: ASTIfClause): ElseIfOperation {
			const body = new BodyOperation(item.body);
			const condition = visit(item.condition);

			for (let bodyItem of item.body) {
				body.stack.push(visit(bodyItem));
			}

			return new ElseIfOperation(item, {
				body,
				condition
			});
		},
		'ElseClause': function(item: ASTElseClause): ElseOperation {
			const body = new BodyOperation(item.body);

			for (let bodyItem of item.body) {
				body.stack.push(visit(bodyItem));
			}

			return new ElseOperation(item, {
				body
			});
		},
		'NegationExpression': function(item: ASTUnaryExpression): NotOperation {
			const arg = visit(item.argument);

			return new NotOperation(item, { arg });
		},
		'ContinueStatement': function(item: ASTBase): ContinueOperation {
			return new ContinueOperation(item);
		},
		'BreakStatement': function(item: ASTBase): BreakOperation {
			return new BreakOperation(item);
		},
		'CallExpression': function(item: ASTCallExpression): CallExpression {
			return new CallExpression(item, visit);
		},
		'CallStatement': function(item: ASTCallStatement): CallExpression {
			return new CallExpression(item, visit);
		},
		'FeatureImportExpression': function(_item: ASTBase) {
			throw new Error('Not supported');
		},
		'FeatureIncludeExpression': function(_item: ASTBase) {
			throw new Error('Not supported');
		},
		'ImportCodeExpression': function(item: ASTImportCodeExpression): any {
			const resourceHandler = context.resourceHandler;
			const target = resourceHandler.getTargetRelativeTo(
				context.target,
				// @ts-ignore: FileSystemDirectory is always a string
				(item.fileSystemDirectory as ASTLiteral).value
			);
			const code = context.resourceHandler.get(target);
			const parser = new CodeParser(code);
			const chunk = parser.parseChunk();

			return visit(chunk);
		},
		'FeatureDebuggerExpression': function(item: ASTBase): DebuggerOperation {
			return new DebuggerOperation(item);
		},
		'ListConstructorExpression': function(item: ASTListConstructorExpression): ListExpression {
			return new ListExpression(item, visit);
		},
		'BooleanLiteral': function(item: ASTLiteral): CustomBoolean {
			// @ts-ignore: Key is always a literal
			return new CustomBoolean(item.value);
		},
		'EmptyExpression': function(item: ASTBase) {},
		'BinaryExpression': function(item) {
			return new LogicalAndBinaryExpression(item, visit);
		},
		'BinaryNegatedExpression': function(item: ASTUnaryExpression): BinaryNegatedExpression {
			return new BinaryNegatedExpression(item, visit);
		},
		'LogicalExpression': function(item: ASTEvaluationExpression): LogicalAndBinaryExpression {
			return new LogicalAndBinaryExpression(item, visit);
		},
		'UnaryExpression': function(item: ASTUnaryExpression): ReferenceOperation | NewOperation {
			const arg = visit(item.argument);
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
		'Chunk': function(item: ASTChunk): BodyOperation {
			const op = new BodyOperation(item.body);

			for (let bodyItem of item.body) {
				op.stack.push(visit(bodyItem));
			}

			return op;
		}
	};
};

export default class CPS {
	cpsMap: CPSMapType;

	constructor(context: CPSMapContext) {
		const me = this;
		me.cpsMap = CPSMap(me.visit.bind(me), context);
	}

	visit(o: ASTBase): any {
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
		const result = fn.call(me, o);
		return result;
	}
}