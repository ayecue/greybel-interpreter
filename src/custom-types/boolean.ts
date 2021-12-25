import { CustomLiteralType } from '../types/custom-type';

export default class CustomBoolean extends CustomLiteralType {
	static intrinsics: Map<string, Function> = new Map();
	value: boolean;

	constructor(value: boolean) {
		super();
		this.value = value;
	}

	getType(): string {
		return 'boolean';
	}

	valueOf(): boolean {
		return this.value;
	}

	toString(): string {
		return this.value.toString();
	}

	fork(): CustomBoolean {
		return new CustomBoolean(this.value);
	}
}