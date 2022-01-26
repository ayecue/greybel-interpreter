import { ASTBase } from 'greybel-core';
import { OperationContext } from '../context';

export abstract class Expression {
	ast: any;
	expr: any;
	target?: string;

	abstract get(operationContext: OperationContext, parentExpr?: any): any;
}
