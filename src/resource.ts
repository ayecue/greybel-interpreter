export interface ResourceHandler {
	getTargetRelativeTo(source: string, target: string): Promise<string>;
	has(target: string): Promise<boolean>;
	get(target: string): Promise<string>;
	resolve(target: string): Promise<string>;
}

export class ResourceProvider {
	getHandler(): ResourceHandler {
		const fs = require('fs');
		const path = require('path');

		return {
			getTargetRelativeTo: (source: string, target: string): Promise<string> => {
				const base = path.resolve(source, '..');
				const result = path.resolve(base, target);
				return Promise.resolve(fs.existsSync(result) ? result : result + '.src');
			},
			has: (target: string): Promise<boolean> => {
				return Promise.resolve(fs.existsSync(target));
			},
			get: (target: string): Promise<string> => {
				return Promise.resolve(fs.readFileSync(target, 'utf8'));
			},
			resolve: (target: string): Promise<string> => {
				return Promise.resolve(path.resolve(target));
			}
		};
	}
}