import {
	ASTBase,
	ASTMemberExpression,
	ASTIndexExpression,
	ASTIdentifier,
	ASTSliceExpression
} from 'greybel-core';
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

export default class PathExpression extends Expression {
	constructor(ast: ASTBase, visit: Function) {
		super();
		const me = this;
		const append = function(expr: any, v: any): any[] {
			if (Array.isArray(v)) {
				return expr.concat(v);
			}
			
			return expr.concat([v]);
		};
		const buildExpression = function(node: ASTBase): any[] {
			let expression: any[] = [];

			switch (node.type) {
				case 'MemberExpression':
					const memberExpression = <ASTMemberExpression>node;

					expression = append(expression, buildExpression(memberExpression.base));
					expression = append(expression, buildExpression(memberExpression.identifier));

					break;
				case 'IndexExpression':
					const indexExpression = <ASTIndexExpression>node;

					expression = append(expression, buildExpression(indexExpression.base));

					if (indexExpression.index?.type === 'SliceExpression') {
						const sliceExpression = <ASTSliceExpression>indexExpression.index
						expression = append(expression, {
							type: 'slice',
							left: visit(sliceExpression.left),
							right: visit(sliceExpression.right)
						});
					} else {
						expression = append(expression, {
							type: 'index',
							value: visit(indexExpression.index)
						});
					}

					break;
				case 'Identifier':
					const identifier = <ASTIdentifier>node;

					expression = append(expression, {
						type: 'path',
						value: identifier.name
					});
					break;
				default:
					expression = append(expression, visit(node));
			}

			return expression;
		};

		me.ast = ast;
		me.expr = buildExpression(ast);
	}

	isCustomValueCall(): boolean {
		return isCustomValue(this.expr[0]);
	}

	getByIndex(index: number): any {
		return this.expr[index];
	}

	async get(operationContext: OperationContext, parentExpr: any): Promise<any> {
		const me = this;
		const evaluate = async function(node: any[]): Promise<PathEvaluationResult> {
			const traverselPath = [].concat(node);
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
				} else if (current?.type === 'path') {
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
				} else if (current?.type === 'index') {
					current = current.value;

					if (isCustomValue(current)) {
						traversedPath.push(current.valueOf());
					} else if (current instanceof Expression) {
						const value = await current.get(operationContext);
						traversedPath.push(value);
					} else {
						operationContext.debugger.raise('Unexpected index', me, current);
					}
				} else if (current?.type === 'slice') {
					if (!handle) {
						handle = await operationContext.get(traversedPath);
						traversedPath = [];
					} else if (!isCustomList(handle) && !isCustomString(handle)) {
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

		operationContext.debugger.debug('PathExpression', 'get', 'expr', me.expr);

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
						return await value.call(context);
					}

					return value;
				}

				return cast(resultExpr.handle.callMethod(resultExpr.path));
			}

			const value = await operationContext.get(resultExpr.path);

			if (value instanceof Function) {
				const callable = await operationContext.getCallable(resultExpr.path);

				return cast(await callable.origin.call(callable.context));
			} else if (value?.isOperation) {
				return value.run(operationContext);
			}

			return value;
		}

		return resultExpr;
	}
}