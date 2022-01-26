import { CustomLiteralType } from '../types/custom-type';

export default class CustomNil extends CustomLiteralType {
	static intrinsics: Map<string, Function> = new Map();
	value: null = null;

	getType(): string {
		return 'null';
	}

	toNumber(): number {
		return Number.NaN;
	}

	toTruthy(): boolean {
		return false;
	}

	toString(): string {
		return 'null';
	}
}