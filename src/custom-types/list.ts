import { FunctionOperationBase } from '../types/operation';
import { CustomLiteralType, CustomObjectType, Callable } from '../types/custom-type';
import CustomString from './string';

export class CustomListIterator implements Iterator<any> {
	value: any[];
	index: number;

	constructor(value: any) {
		const me = this;
		me.value = value;
		me.index = 0;
	}

	next(): IteratorResult<any> {
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

export function itemAtIndex(list: any[], n: number): number | null {
	if (Number.isNaN(n)) return null;
	n = Math.trunc(n) || 0;
	if (n < 0) n += list.length;
	if (n < 0 || n >= list.length) return -1;
	return n;
}

export default class CustomList extends CustomObjectType {
	static intrinsics: Map<string, Function> = new Map();
	value: any[];

	static isNumber(value: string): boolean {
		return !Number.isNaN(Number(value));
	}

	constructor(value: any[]) {
		super();
		this.value = value;
	}

	[Symbol.iterator]() {
		return new CustomListIterator(this.value);
	}

	concat(list: CustomList): CustomList {
		return new CustomList(this.value.concat(list.value));
	}

	slice = function(a: CustomLiteralType, b: CustomLiteralType): CustomList {
		return new CustomList(this.value.slice(a.toNumber(), b.toNumber()));
	}

	async set(path: any[], value: any): Promise<void> {
		const me = this;
		const traversalPath = [].concat(path);
		const refs = me.value;
		const last = traversalPath.pop();
		const current = traversalPath.shift();

		if (current != null) {
			const indexResult = itemAtIndex(refs, Number(current));

			if (refs.hasOwnProperty(indexResult)) {
				const sub = refs[indexResult];

				if (sub instanceof CustomObjectType) {
					return sub.set(traversalPath.concat([last]), value);
				}
			}

			throw new Error(`Cannot set path ${path.join('.')}`);
		}

		const lastIndex = itemAtIndex(refs, Number(last));

		if (!refs.hasOwnProperty(lastIndex)) {
			throw new Error(`Index error (list index ${lastIndex} out of range)`);
		}

		if (value instanceof FunctionOperationBase) {
			refs[lastIndex] = value.fork(me);
		} else {
			refs[lastIndex] = value;
		}
	}

	async get (path: any[]): Promise<any> {
		const me = this;

		if (path.length === 0) {
			return me;
		}

		const traversalPath = [].concat(path);
		const refs = me.value;
		const current = traversalPath.shift();

		if (current != null) {
			const currentIndex = itemAtIndex(refs, Number(current));

			if (refs.hasOwnProperty(currentIndex)) {
				const sub = refs[currentIndex];

				if (
					traversalPath.length > 0 &&
					(sub instanceof CustomObjectType || sub instanceof CustomString)
				) {
					return sub.get(traversalPath);
				}

				if (traversalPath.length === 0) {
					return sub;
				}
			} else if (path.length === 1 && CustomList.intrinsics.has(current)) {
				return CustomList.intrinsics.get(current).bind(null, me);
			}
		}
		
		return null;
	}

	async getCallable(path: any[]): Promise<Callable> {
		const me = this;
		const traversalPath = [].concat(path);
		const refs = me.value;
		const current = traversalPath.shift();

		if (current != null) {
			const currentIndex = itemAtIndex(refs, Number(current));

			if (refs.hasOwnProperty(currentIndex)) {
				const sub = refs[currentIndex];

				if (sub instanceof CustomObjectType || sub instanceof CustomString) {
					return sub.getCallable(traversalPath);
				}

				if (traversalPath.length === 0) {
					return Promise.resolve({
						origin: sub,
						context: me
					});
				}
			} else if (path.length === 1 && CustomList.intrinsics.has(current)) {
				return {
					origin: CustomList.intrinsics.get(current).bind(null, me),
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
		return 'list';
	}

	toString(): string {
		const me = this;
		const body = me.value.map((item) => item?.toString());

		return `[${body.join(',')}]`;
	}

	toNumber(): number {
		return 0;
	}

	toTruthy(): boolean {
		return this.value.length > 0;
	}

	valueOf(): any[] {
		return this.value;
	}

	fork(): CustomList {
		return new CustomList(this.value);
	}
}