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

	toString(): string {
		return this.value.toString();
	}

	toNumber(): number {
		return this.value;
	}

	toTruthy(): boolean {
		return Number.isNaN(this.value) ? false : !!this.value;
	}

	valueOf(): number {
		return this.value;
	}

	fork(): CustomNumber {
		return new CustomNumber(this.value);
	}
}