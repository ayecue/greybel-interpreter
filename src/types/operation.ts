import { OperationContext } from '../context';
import { ASTBase } from 'greybel-core';

export abstract class Operation {
	ast: any;
	target?: string;

	get(operationContext: OperationContext): any {
		throw new Error('Implentation of "get" missing');
	}

	run(operationContext: OperationContext): any | void {
		throw new Error('Implentation of "run" missing');
	}
}

export abstract class FunctionOperationBase extends Operation {
	abstract fork(context: any): FunctionOperationBase;
}