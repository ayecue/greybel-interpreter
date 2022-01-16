import { CustomLiteralType } from '../types/custom-type';

export default class CustomNumber extends CustomLiteralType {
	static intrinsics: Map<string, Function> = new Map();
	value: number;

	constructor(value: number) {
		super();
		this.value = value;
	}

	getType(): string {
		return 'number';
	}

	valueOf(): number {
		return this.value;
	}

	toString(): string {
		return this.value.toString();
	}

	fork(): CustomNumber {
		return new CustomNumber(this.value);
	}
}