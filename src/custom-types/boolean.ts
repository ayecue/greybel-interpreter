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

	toString(): string {
		return this.value.toString();
	}

	fork(): CustomBoolean {
		return new CustomBoolean(this.value);
	}

	toNumber(): number {
		return Number(this.value);
	}

	toTruthy(): boolean {
		return this.value;
	}

	valueOf(): boolean {
		return this.value;
	}
}