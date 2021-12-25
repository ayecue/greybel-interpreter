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
	value: any;
	isInstance: boolean;

	constructor(value: any) {
		super();
		const me = this;
		me.value = value;
		me.isInstance = false;
	}

	[Symbol.iterator]() {
		return new CustomMapIterator(this.value);
	}

	extend(value: { [key: string]: any }): CustomMap {
		const me = this;
		me.value = {
			...me.value,
			...value
		};
		return me;
	}

	async set(path: any[], value: any): Promise<void> {
		const me = this;
		const traversalPath = [].concat(path);
		const refs = me.value;
		const last = traversalPath.pop();
		const current = traversalPath.shift();
		let origin = refs;

		if (current != null) {
			if (current in origin) {
				origin = origin[current];

				if (origin instanceof CustomObjectType) {
					return origin.set(traversalPath.concat([last]), value);
				}
			} else {
				throw new Error(`Cannot set path ${path.join('.')}`);
			}
		}

		if (origin) {
			if (value instanceof FunctionOperationBase) {
				origin[last] = value.fork(me);
			} else {
				origin[last] = value;
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
			if (currentValue in origin) {
				origin = origin[currentValue];

				if (traversalPath.length > 0 && origin instanceof CustomObjectType) {
					return origin.get(traversalPath);
				}
			} else if (path.length === 1 && CustomMap.intrinsics.has(currentValue)) {
				return CustomMap.intrinsics.get(currentValue);
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
			if (current in origin) {
				context = origin;
				origin = origin[current];

				if (origin instanceof CustomObjectType) {
					return origin.getCallable(traversalPath);
				}
			} else if (path.length === 1 && CustomMap.intrinsics.has(current)) {
				return {
					origin: CustomMap.intrinsics.get(current),
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
		const key = method[0].valueOf();

		if (method.length > 1) {
			if (me.value[key]) {
				return me.value[key].callMethod(method.slice(1), ...args);
			}

			throw new Error(`Unexpected method path`);
		}

		if (!CustomMap.intrinsics.has(key)) {
			throw new Error(`Cannot access ${key} in map`);
		}

		return CustomMap.intrinsics.get(key).call(me, ...args);
	}

	createInstancefunction(): CustomMap {
		const me = this;
		const value: any = {};
		const newInstance = new CustomMap(value);

		newInstance.isInstance = true;
		
		Object.keys(me.value).forEach((key: string) => {
			const item = me.value[key];

			if (item instanceof FunctionOperationBase) {
				value[key] = item.fork(newInstance);
			} else {
				value[key] = item;
			}
		});
		
		return newInstance;
	}

	getType(): string {
		const me = this;
		const value = me.value;

		if (value.classID) {
			return value.classID;
		}

		return 'map';
	}

	valueOf(): { [key: string]: any } | null {
		const me = this;
		const value = me.value;
		return Object
			.keys(value)
			.length === 0 ? null : me;
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