import {
	ASTBase,
	ASTMemberExpression,
	ASTIndexExpression,
	ASTIdentifier,
	ASTSliceExpression
} from 'greybel-core';
import { ASTType } from 'greyscript-core';
import { Operation } from '../types/operation';
import { Expression } from '../types/expression';
import { OperationContext } from '../context';
import {
	isCustomValue,
	isCustomString,
	isCustomList,
	isCustomMap,
	cast
} from '../typer';

export interface PathEvaluationResult {
	handle: any;
	path: string[];
}

export class SliceSegment {
	left: any;
	right: any;

	constructor(left: any, right: any) {
		this.left = left;
		this.right = right;
	}
}

export class IndexSegment {
	value: any;

	constructor(value: any) {
		this.value = value;
	}
}

export class PathSegment {
	value: string;

	constructor(value: string) {
		this.value = value;
	}
}

export class ExpressionSegment {
	value: any[];

	constructor() {
		this.value = [];
	}

	append(val: any): ExpressionSegment {
		const me = this;

		if (val instanceof ExpressionSegment) {
			me.value = me.value.concat(val.value);
			return me;
		}

		me.value = me.value.concat(val);
		return me;
	}
}

export default class PathExpression extends Expression {
	expr: ExpressionSegment;

	constructor(ast: ASTBase) {
		super();
		const me = this;

		me.ast = ast;
		me.expr = null;
	}

	async prepare(visit: Function): Promise<PathExpression> {
		const me = this;
		const buildExpression = async function(node: ASTBase): Promise<ExpressionSegment> {
			let expression = new ExpressionSegment();

			switch (node.type) {
				case ASTType.MemberExpression:
					const memberExpression = <ASTMemberExpression>node;

					expression.append(await buildExpression(memberExpression.base));
					expression.append(await buildExpression(memberExpression.identifier));

					break;
				case ASTType.IndexExpression:
					const indexExpression = <ASTIndexExpression>node;

					expression.append(await buildExpression(indexExpression.base));

					if (indexExpression.index?.type === 'SliceExpression') {
						const sliceExpression = <ASTSliceExpression>indexExpression.index;
						expression.append(new SliceSegment(
							await visit(sliceExpression.left),
							await visit(sliceExpression.right)
						));
					} else {
						expression.append(new IndexSegment(
							await visit(indexExpression.index)
						));
					}

					break;
				case ASTType.Identifier:
					const identifier = <ASTIdentifier>node;

					expression.append(new PathSegment(identifier.name));
					break;
				default:
					expression.append(await visit(node));
			}

			return expression;
		};

		me.expr = await buildExpression(me.ast);

		return me;
	}

	async get(operationContext: OperationContext, parentExpr: any): Promise<any> {
		const me = this;
		const evaluate = async function(node: ExpressionSegment): Promise<PathEvaluationResult> {
			const traverselPath = [].concat(node.value);
			let traversedPath = [];
			let position = 0;
			let handle;
			let current;

			while (current = traverselPath.shift()) {
				if (isCustomValue(current)) {
					handle = current;
				} else if (current instanceof Expression) {
					handle = await current.get(operationContext, me.expr);
				} else if (current instanceof Operation) {
					handle = await current.get(operationContext);
				} else if (current instanceof PathSegment) {
					if (current.value === 'self' && position === 0) {
						const functionContext = operationContext.getMemory('functionContext');

						if (functionContext?.context) {
							handle = functionContext.context;
						} else {
							operationContext.debugger.raise('Unexpected self', me, current);
						}
					} else {
						traversedPath.push(current.value);

						if (traverselPath.length > 0) {
							const origin: any = await (handle || operationContext).get(traversedPath);

							if (isCustomValue(origin)) {
								handle = origin;
								traversedPath = [];
							} else if (origin instanceof Function) {
								handle = await origin.call(handle);
								traversedPath = [];
							}
						}
					}
				} else if (current instanceof IndexSegment) {
					current = current.value;

					if (isCustomValue(current)) {
						traversedPath.push(current.valueOf());
					} else if (current instanceof Expression) {
						const value = await current.get(operationContext);
						traversedPath.push(value);
					} else {
						operationContext.debugger.raise('Unexpected index', me, current);
					}
				} else if (current instanceof SliceSegment) {
					if (!handle) {
						handle = await operationContext.get(traversedPath);
						traversedPath = [];
					}

					if (!isCustomList(handle) && !isCustomString(handle)) {
						operationContext.debugger.raise('Invalid type for slice', me, handle);
					}

					let left = current.left;

					if (isCustomValue(left)) {
						left = left;
					} else if (left instanceof Expression) {
						left = await left.get(operationContext);
					}

					let right = current.right;

					if (isCustomValue(right)) {
						right = right;
					} else if (right instanceof Expression) {
						right = await right.get(operationContext);
					}

					handle = handle.slice(left, right);
				} else {
					operationContext.debugger.raise('Unexpected handle', me, current);
				}

				position++;
			}

			return {
				handle: handle,
				path: traversedPath
			};
		};

		operationContext.debugger.debug('Line', me.ast.start.line, 'PathExpression', 'get', 'expr', me.expr);

		const resultExpr = await evaluate(me.expr);

		if (!parentExpr) {
			if (resultExpr.handle) {
				if (resultExpr.path.length === 0) {
					return resultExpr.handle;
				} else if (isCustomMap(resultExpr.handle)) {
					const context = resultExpr.handle;
					const value = await context.get(resultExpr.path);

					if (value instanceof Operation) {
						return value.run(operationContext);
					} else if (value instanceof Function) {
						return cast(await value.call(context));
					}

					return value;
				}

				return cast(resultExpr.handle.callMethod(resultExpr.path));
			}

			const value = await operationContext.get(resultExpr.path);

			if (value instanceof Function) {
				const callable = await operationContext.getCallable(resultExpr.path);

				return cast(await callable.origin.call(callable.context));
			} else if (value instanceof Operation) {
				return value.run(operationContext);
			}

			return value;
		}

		return resultExpr;
	}
}