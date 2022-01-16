import { CustomObjectType, Callable } from '../types/custom-type';
import { Operation, FunctionOperationBase } from '../types/operation';

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

	set(path: string[], value: any): Promise<void> {
		const me = this;
		const traversalPath = [].concat(path);
		const refs = me.value;
		const last = traversalPath.pop();
		const current = traversalPath.shift();
		let origin = refs;

		if (current != null) {
			if (origin.has(current)) {
				origin = origin.get(current);

				if (origin instanceof CustomObjectType) {
					return origin.set(traversalPath.concat(last), value);
				}
			} else {
				throw new Error(`Cannot set path ${path.join('.')}`);
			}
		}

		if (origin) {
			if (value instanceof FunctionOperationBase) {
				origin.set(last, value.fork(me));
			} else {
				origin.set(last, value);
			}
		} else {
			throw new Error(`Cannot set path ${path.join('.')}`);
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
		const currentValue = current.valueOf();
		let origin = refs;

		if (currentValue != null) {
			if (origin.has(currentValue)) {
				origin = origin.get(currentValue);

				if (traversalPath.length > 0 && origin instanceof CustomObjectType) {
					return origin.get(traversalPath);
				}
			} else if (path.length === 1 && CustomMap.intrinsics.has(currentValue)) {
				return Promise.resolve(
					CustomMap.intrinsics.get(currentValue).bind(null, me)
				);
			} else {
				throw new Error(`Cannot get path ${path.join('.')}`);
			}
		} else {
			return null;
		}
		
		return Promise.resolve(origin);
	}

	getCallable(path: string[]): Promise<Callable> {
		const me = this;
		const traversalPath = [].concat(path);
		const refs = me.value;
		const current = traversalPath.shift();
		let origin = refs;
		let context;

		if (current != null) {
			if (origin.has(current)) {
				context = origin;
				origin = origin.get(current);

				if (origin instanceof CustomObjectType) {
					return origin.getCallable(traversalPath);
				}
			} else if (path.length === 1 && CustomMap.intrinsics.has(current)) {
				return Promise.resolve({
					origin: CustomMap.intrinsics.get(current).bind(null, me),
					context: me
				});
			} else {
				throw new Error(`Cannot get path ${path.join('.')}`);
			}
		}

		return Promise.resolve({
			origin: origin,
			context: context
		});
	}

	callMethod(method: string[], ...args: any[]): any {
		if (method.length === 0) {
			throw new Error('Unexpected method length');
		}

		const me = this;
		const key = method[0].valueOf();

		if (method.length > 1) {
			if (me.value.has(key)) {
				return me.value.get(key).callMethod(method.slice(1), ...args);
			}

			throw new Error(`Unexpected method path`);
		}

		if (!CustomMap.intrinsics.has(key)) {
			throw new Error(`Cannot access ${key} in map`);
		}

		return CustomMap.intrinsics.get(key)(me, ...args);
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

	valueOf(): CustomMap | null {
		const me = this;
		const value = me.value;
		return value.size === 0 ? null : me;
	}

	toString(): string {
		const me = this;
		const body = Object
			.entries(me.value)
			.map(([key, value]) => `"${key}": ${value.valueOf().toString()}`);

		return `{${body.join(',')}}`;
	}

	fork(): CustomMap {
		return new CustomMap(this.value);
	}
}