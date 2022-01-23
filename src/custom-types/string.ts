import { CustomLiteralType } from '../types/custom-type';

export class CustomStringIterator implements Iterator<string> {
	value: string;
	index: number;

	constructor(value: string) {
		const me = this;
		me.value = value;
		me.index = 0;
	}

	next(): IteratorResult<string> {
		const me = this;

		if (me.index === me.value.length) {
			return {
				value: null,
				done: true
			};
		}

		return {
			value: me.value[me.index++],
			done: false
		};
	}
}

export default class CustomString extends CustomLiteralType {
	static intrinsics: Map<string, Function> = new Map();
	value: string;

	static isNumber(value: string): boolean {
		return !Number.isNaN(Number(value));
	}

	constructor(value: string) {
		super();
		this.value = value;
	}

	slice(a: CustomLiteralType, b: CustomLiteralType): CustomString {
		return new CustomString(this.value.slice(a?.valueOf(), b?.valueOf()));
	}

	[Symbol.iterator]() {
		return new CustomStringIterator(this.value);
	}

	toIndex(value: string): number {
		const me = this;
		const casted = Number(value);
		return casted < 0 ? me.value.length + casted : casted;
	}

	callMethod(method: string[], ...args: any[]): any {
		if (method.length === 0) {
			throw new Error('Unexpected method length');
		}

		const me = this;
		const member = method[0].valueOf();

		if (CustomString.isNumber(member)) {
			const index = me.toIndex(member);

			if (!me.value[index]) {
				console.error(method, member, args);
				throw new Error(`Unexpected index ${index}`);
			}

			const value = new CustomString(me.value[index]);

			if (method.length > 1) {
				return value.callMethod(method.slice(1), ...args);
			}

			return value;
		}

		if (!CustomString.intrinsics.has(member)) {
			throw new Error(`Cannot access ${member} in string`);
		}

		return CustomString.intrinsics.get(member)(me, ...args);
	}

	getType(): string {
		return 'string';
	}

	valueOf(): string | null {
		const me = this;
		return me.value.length === 0 ? null : me.value;
	}

	toString(): string {
		return this.value;
	}

	fork(): CustomString {
		return new CustomString(this.value);
	}
}