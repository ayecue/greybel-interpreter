import { FunctionOperationBase } from '../types/operation';
import { CustomLiteralType, CustomObjectType, Callable } from '../types/custom-type';

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
		return new CustomList(this.value.slice(a.valueOf(), b.valueOf()));
	}

	toIndex(value: string): number | null {
		const me = this;
		const casted = Number(value);
		const result = casted < 0 ? me.value.length + casted : casted;

		if (result < 0) {
			return null;
		}

		return result;
	}

	async set(path: any[], value: any): Promise<void> {
		const me = this;
		const traversalPath = [].concat(path);
		const refs = me.value;
		const last = traversalPath.pop();
		const current = traversalPath.shift();
		let origin = refs;

		if (current != null) {
			const index = me.toIndex(current);

			if (origin.hasOwnProperty(index)) {
				origin = origin[index];

				if (origin instanceof CustomObjectType) {
					return origin.set(traversalPath.concat([last]), value);
				}
			} else {
				throw new Error(`Cannot set path ${path.join('.')}`);
			}
		}

		if (origin) {
			const setterIndex = me.toIndex(last);

			if (!origin.hasOwnProperty(setterIndex)) {
				throw new Error(`Index error (list index ${setterIndex} out of range)`);
			}

			if (value instanceof FunctionOperationBase) {
				origin[setterIndex] = value.fork(me);
			} else {
				origin[setterIndex] = value;
			}
		} else {
			throw new Error(`Cannot set path ${path.join('.')}`);
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
		const currentValue = current.valueOf();
		let origin = refs;

		if (currentValue != null) {
			const index = me.toIndex(current);

			if (origin.hasOwnProperty(index)) {
				origin = origin[index];

				if (traversalPath.length > 0 && origin instanceof CustomObjectType) {
					return origin.get(traversalPath);
				}
			} else if (path.length === 1 && CustomList.intrinsics.has(currentValue)) {
				return CustomList.intrinsics.get(currentValue).bind(null, me);
			} else {
				throw new Error(`Cannot get path ${path.join('.')}`);
			}
		} else {
			return null;
		}
		
		return origin;
	}

	async getCallable(path: any[]): Promise<Callable> {
		const me = this;
		const traversalPath = [].concat(path);
		const refs = me.value;
		const current = traversalPath.shift();
		let origin = refs;
		let context;

		if (current != null) {
			const index = me.toIndex(current);

			if (origin.hasOwnProperty(index)) {
				context = origin;
				origin = origin[index];

				if (origin instanceof CustomObjectType) {
					return origin.getCallable(traversalPath);
				}
			} else if (path.length === 1 && CustomList.intrinsics.has(current)) {
				return {
					origin: CustomList.intrinsics.get(current).bind(null, me),
					context: me
				};
			} else {
				throw new Error(`Cannot get path ${path.join('.')}`);
			}
		}

		return {
			origin: origin,
			context: context
		};
	}

	callMethod(method: string[], ...args: any[]): any {
		if (method.length === 0) {
			throw new Error('Unexpected method length');
		}

		const me = this;
		const member = method[0].valueOf();

		if (CustomList.isNumber(member)) {
			const index = me.toIndex(member);

			if (!me.value.hasOwnProperty(index)) {
				console.error(method, member, args);
				throw new Error(`Unexpected index`);
			}

			if (method.length > 1) {
				return me.value[index].callMethod(method.slice(1), ...args);
			}

			return me.value[index];
		}

		if (!CustomList.intrinsics.has(member)) {
			throw new Error(`Cannot access ${member} in list`);
		}

		return CustomList.intrinsics.get(member)(me, ...args);
	}

	getType(): string {
		return 'list';
	}

	valueOf(): CustomList | null {
		const me = this;
		const value = me.value;
		return value.length === 0 ? null : me;
	}

	toString(): string {
		const me = this;
		const body = me.value.map((item) => item?.valueOf()?.toString());

		return `[${body.join(',')}]`;
	}

	fork(): CustomList {
		return new CustomList(this.value);
	}
}