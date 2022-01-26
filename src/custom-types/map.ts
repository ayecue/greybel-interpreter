import { CustomObjectType, Callable } from '../types/custom-type';
import { Operation, FunctionOperationBase } from '../types/operation';
import CustomString from './string';

export interface CustomMapIterableItem {
	key: string;
	value: any;
}

export class CustomMapIterator implements Iterator<CustomMapIterableItem> {
	value: any;
	index: number;

	constructor(value: any) {
		const me = this;
		me.value = value;
		me.index = 0;
	}

	next(): IteratorResult<CustomMapIterableItem> {
		const me = this;
		const keys = Object.keys(me.value);

		if (me.index === keys.length) {
			return {
				value: null,
				done: true
			};
		}

		const key = keys[me.index++];

		return {
			value: {
				key: key,
				value: me.value[key]
			},
			done: false
		};
	}
}

export default class CustomMap extends CustomObjectType implements Iterable<CustomMapIterableItem> {
	static intrinsics: Map<string, Function> = new Map();
	value: Map<string, any>;
	isInstance: boolean;

	constructor(value?: Map<string, any>) {
		super();
		const me = this;
		me.value = value || new Map();
		me.isInstance = false;
	}

	[Symbol.iterator]() {
		return new CustomMapIterator(this.value);
	}

	extend(value: Map<string, any>): CustomMap {
		const me = this;
		me.value = new Map([
			...me.value.entries(),
			...value.entries()
		]);
		return me;
	}

	has(path: string[]): Promise<boolean> {
		const me = this;

		if (path.length === 0) {
			return Promise.resolve(true);
		}

		const traversalPath = [].concat(path);
		const refs = me.value;
		const current = traversalPath.shift();

		if (current != null) {
			if (refs.has(current)) {
				const sub = refs.get(current);

				if (traversalPath.length > 0 && sub instanceof CustomObjectType) {
					return sub.has(traversalPath);
				}

				if (traversalPath.length === 0) {
					return Promise.resolve(true);
				}
			}
		}

		return Promise.resolve(false);
	}

	set(path: string[], value: any): Promise<void> {
		const me = this;

		if (!path) {
			console.warn('Cannot set empty path for ', me);
			return;
		}

		const traversalPath = [].concat(path);
		const refs = me.value;
		const last = traversalPath.pop();
		const current = traversalPath.shift();

		if (current != null) {
			if (refs.has(current)) {
				const sub = refs.get(current);

				if (sub instanceof CustomObjectType) {
					return sub.set(traversalPath.concat(last), value);
				}
			}

			console.warn(`Cannot set path ${path?.join('.')}`);
			return;
		}

		if (value instanceof FunctionOperationBase) {
			refs.set(last, value.fork(me));
		} else {
			refs.set(last, value);
		}
	}

	get(path: string[]): Promise<any> {
		const me = this;

		if (path.length === 0) {
			return Promise.resolve(me);
		}

		const traversalPath = [].concat(path);
		const refs = me.value;
		const current = traversalPath.shift();

		if (current != null) {
			if (refs.has(current)) {
				const sub = refs.get(current);

				if (
					traversalPath.length > 0 &&
					(sub instanceof CustomObjectType || sub instanceof CustomString)
				) {
					return sub.get(traversalPath);
				}

				if (traversalPath.length === 0) {
					return sub;
				}
			} else if (path.length === 1 && CustomMap.intrinsics.has(current)) {
				return Promise.resolve(
					CustomMap.intrinsics.get(current).bind(null, me)
				);
			} else {
				throw new Error(`Cannot get path ${path.join('.')}`);
			}
		}

		return Promise.resolve(null);
	}

	getCallable(path: string[]): Promise<Callable> {
		const me = this;
		const traversalPath = [].concat(path);
		const refs = me.value;
		const current = traversalPath.shift();

		if (current != null) {
			if (refs.has(current)) {
				const sub = refs.get(current);

				if (sub instanceof CustomObjectType || sub instanceof CustomString) {
					return sub.getCallable(traversalPath);
				}

				if (traversalPath.length === 0) {
					return Promise.resolve({
						origin: sub,
						context: me
					});
				}
			} else if (path.length === 1 && CustomMap.intrinsics.has(current)) {
				return Promise.resolve({
					origin: CustomMap.intrinsics.get(current).bind(null, me),
					context: me
				});
			} else {
				throw new Error(`Cannot get callable path ${path.join('.')}`);
			}
		}

		return Promise.resolve({
			origin: null,
			context: me
		});
	}

	createInstance(): CustomMap {
		const me = this;
		const newInstance = new CustomMap();

		newInstance.isInstance = true;
		
		me.value.forEach((item: any, key: string) => {
			newInstance.value.set(
				key,
				item instanceof FunctionOperationBase
					? item.fork(newInstance)
					: item
			);
		});
		
		return newInstance;
	}

	getType(): string {
		const me = this;
		return me.value.get('classID')?.toString() || 'map';
	}

	toNumber(): number {
		return Number.NaN;
	}

	toTruthy(): boolean {
		return this.value.size > 0;
	}

	toString(): string {
		const me = this;
		const body = Object
			.entries(me.value)
			.map(([key, value]) => `"${key}": ${value?.toString()}`);

		return `{${body.join(',')}}`;
	}

	valueOf(): Map<string, any> {
		return this.value;
	}

	fork(): CustomMap {
		return new CustomMap(this.value);
	}
}