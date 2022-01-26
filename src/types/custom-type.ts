export abstract class CustomType {
	static intrinsics: Map<string, Function>;

	getType(): string {
		throw new Error('Implentation of "getType" missing');
	}
	
	toNumber(): number {
		throw new Error('Implentation of "toNumber" missing');
	}

	toString(): string {
		throw new Error('Implentation of "toString" missing');
	}

	toTruthy(): boolean {
		throw new Error('Implentation of "toTruthy" missing');
	}
}

export abstract class CustomLiteralType extends CustomType {
	value: any;
}

export abstract class CustomObjectType extends CustomType {
	value: any;

	has(path: any[]): Promise<boolean> {
		throw new Error('Implentation of "has" missing');
	}

	set(path: any[], value: any): Promise<void> {
		throw new Error('Implentation of "set" missing');
	}

	get(path: any[]): Promise<any> {
		throw new Error('Implentation of "get" missing');
	}

	getCallable(path: any[]): Promise<Callable> {
		throw new Error('Implentation of "getCallable" missing');
	}
}

export interface Callable {
	origin: any;
	context: any;
}