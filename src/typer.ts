import CustomBoolean from './custom-types/boolean';
import CustomList from './custom-types/list';
import CustomMap from './custom-types/map';
import CustomNil from './custom-types/nil';
import CustomNumber from './custom-types/number';
import CustomString from './custom-types/string';
import { Operation } from './types/operation';

export const isCustomValue = function(value: any): boolean {
	return 	value instanceof CustomBoolean ||
			value instanceof CustomNumber ||
			value instanceof CustomList ||
			value instanceof CustomMap ||
			value instanceof CustomNil ||
			value instanceof CustomString;
};

export const isCustomMap = function(value: any): boolean {
	return value instanceof CustomMap;
};

export const isCustomList = function(value: any): boolean {
	return value instanceof CustomList;
};

export const isCustomString = function(value: any): boolean {
	return value instanceof CustomString;
};

export const isCustomNumber = function(value: any): boolean {
	return value instanceof CustomNumber;
};

export const cast = function(value: any): any {
	if (value == null)  return new CustomNil();

	if (isCustomValue(value) || value instanceof Operation) {
		return value;
	}

	const type = typeof value;

	if (type === 'string') {
		return new CustomString(value);
	} else if (type === 'number') {
		return new CustomNumber(value);
	} else if (type === 'boolean') {
		return new CustomBoolean(value);
	} else if (type === 'object') {
		if (Array.isArray(value)) {
			value = value.map(cast);

			return new CustomList(value);
		}

		value = Object.entries(value).reduce((result, [key, item]) => {
			return {
				...result,
				[key]: cast(item)
			};
		}, {});

		return new CustomMap(value);
	} else if (type === 'function') {
		return value;
	}

	throw new Error(`Unexpected type ${type}`);
};