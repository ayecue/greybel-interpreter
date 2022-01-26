import { Callable } from '../types/custom-type';
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

export function itemAtIndex(str: any, n: number): number | null {
	if (Number.isNaN(n)) return null;
	n = Math.trunc(n) || 0;
	if (n < 0) n += str.length;
	if (n < 0 || n >= str.length) return -1;
	return n;
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
		return new CustomString(this.value.slice(a?.toNumber(), b?.toNumber()));
	}

	[Symbol.iterator]() {
		return new CustomStringIterator(this.value);
	}

	async get (path: any[]): Promise<any> {
		const me = this;

		if (path.length === 0) {
			return me;
		}

		const traversalPath = [].concat(path);
		const str = me.value;
		const current = traversalPath.shift();

		if (current != null) {
			const currentIndex = itemAtIndex(str, Number(current));

			if (currentIndex != null && str.charAt(currentIndex) != null) {
				return new CustomString(str.charAt(currentIndex));
			} else if (path.length === 1 && CustomString.intrinsics.has(current)) {
				return CustomString.intrinsics.get(current).bind(null, me);
			}
		}

		return null;
	}

	async getCallable(path: any[]): Promise<Callable> {
		const me = this;
		const traversalPath = [].concat(path);
		const current = traversalPath.shift();

		if (current != null) {
			if (path.length === 1 && CustomString.intrinsics.has(current)) {
				return {
					origin: CustomString.intrinsics.get(current).bind(null, me),
					context: me
				};
			}
		}

		return {
			origin: null,
			context: me
		};
	}

	getType(): string {
		return 'string';
	}

	toString(): string {
		return this.value;
	}

	toNumber(): number {
		return Number(this.value);
	}

	toTruthy(): boolean {
		return this.value.length > 0;
	}

	fork(): CustomString {
		return new CustomString(this.value);
	}
}