export interface ResourceHandler {
	getTargetRelativeTo(source: string, target: string): string;
	has(target: string): boolean;
	get(target: string): string;
	resolve(target: string): string;
}

export class ResourceProvider {
	getHandler(): ResourceHandler {
		const fs = require('fs');
		const path = require('path');

		return {
			getTargetRelativeTo: (source: string, target: string): string => {
				const base = path.resolve(source, '..');
				const result = path.resolve(base, target);
				return fs.existsSync(result) ? result : result + '.src';
			},
			has: (target: string): boolean => {
				return fs.existsSync(target);
			},
			get: (target: string): string => {
				return fs.readFileSync(target, 'utf8');
			},
			resolve: (target: string): string => {
				return path.resolve(target);
			}
		};
	}
}