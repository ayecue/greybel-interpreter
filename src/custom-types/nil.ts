import { CustomLiteralType } from '../types/custom-type';

export default class CustomNil extends CustomLiteralType {
	static intrinsics: Map<string, Function> = new Map();
	value: null = null;

	getType(): string {
		return 'null';
	}

	valueOf(): null {
		return null;
	}

	toString(): string {
		return 'null';
	}
}