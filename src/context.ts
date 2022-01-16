import TopOperation from './operations/top';
import CustomBoolean from './custom-types/boolean';
import CustomNumber from './custom-types/number';
import CustomString from './custom-types/string';
import CustomNil from './custom-types/nil';
import CustomMap from './custom-types/map';
import CustomList from './custom-types/list';
import { Operation } from './types/operation';
import { Expression } from './types/expression';
import { CustomObjectType, Callable } from './types/custom-type';
import { Parser as CodeParser } from 'greybel-core';
import CPS from './cps';

export enum ContextType {
	API = 'API',
	GLOBAL = 'GLOBAL',
	FUNCTION = 'FUNCTION',
	INJECTION = 'INJECTION',
	EXTERNAL = 'EXTERNAL',
	LOOP = 'LOOP',
	MAP = 'MAP',
	CALL = 'CALL'
}

export enum ContextState {
	TEMPORARY = 'TEMPORARY',
	DEFAULT = 'DEFAULT'
}

export class Scope extends CustomMap {
	context: OperationContext;

	constructor(context: OperationContext) {
		super();
		this.context = context;
	}

	set(path: string[], value: any): Promise<void> {
		const me = this;
		const traversalPath = [].concat(path);
		const current = traversalPath.shift();

		if (current != null) {
			if (current === 'globals') {
				if (me.context.type === ContextType.GLOBAL) {
					return me.set(traversalPath, value);
				} else if (me.context.previous && !me.context.previous.isProtected) {
					return me.context.previous.set(traversalPath, value);
				} else {
					throw new Error(`Cannot set globals scope for ${path.join('.')}`);
				}
			} else if (current === 'locals') {
				if (
					me.context.type === ContextType.GLOBAL || 
					me.context.type === ContextType.FUNCTION
				) {
					return me.set(traversalPath, value);
				} else if (me.context.previous && !me.context.previous.isProtected) {
					return me.context.previous.set(traversalPath, value);
				} else {
					throw new Error(`Cannot set locals scope for ${path.join('.')}`);
				}
			} else {
				return super.set(path, value);
			}
		}
	}

	get(path: string[]): Promise<any> {
		const me = this;
		const traversalPath = [].concat(path);
		const current = traversalPath.shift();

		if (current != null) {
			if (me.value.has(current)) {
				return super.get(path);
			} else if (path.length === 1 && CustomMap.intrinsics.has(current)) {
				return CustomMap.intrinsics.get(current).bind(null, me);
			} else if (current === 'globals') {
				if (me.context.type === ContextType.GLOBAL) {
					if (path.length === 1) {
						return Promise.resolve(me);
					}
					return me.get(traversalPath);
				} else if (me.context.previous) {
					return me.context.previous.get(traversalPath);
				} else {
					throw new Error(`Cannot find globals scope for ${path.join('.')}`);
				}
			} else if (current === 'locals') {
				if (
					me.context.type === ContextType.GLOBAL || 
					me.context.type === ContextType.FUNCTION
				) {
					if (path.length === 1) {
						return Promise.resolve(me);
					}
					return me.get(traversalPath);
				} else if (me.context.previous) {
					return me.context.previous.get(traversalPath);
				} else {
					throw new Error(`Cannot find locals scope for ${path.join('.')}`);
				}
			} else if (me.context.previous) {
				return me.context.previous.get(path);
			} else {
				throw new Error(`Cannot get path ${path.join('.')}`);
			}
		}
		
		return null;
	}

	getCallable(path: string[]): Promise<Callable> {
		const me = this;
		const traversalPath = [].concat(path);
		const current = traversalPath.shift();

		if (current != null) {
			if (me.value.has(current)) {
				return super.getCallable(path);
			} else if (path.length === 1 && CustomMap.intrinsics.has(current)) {
				return Promise.resolve({
					origin: CustomMap.intrinsics.get(current).bind(null, me),
					context: me
				});
			} else if (current === 'globals') {
				if (me.context.type === ContextType.GLOBAL) {
					if (path.length === 1) {
						return Promise.resolve({
							origin: me,
							context: null
						});
					}
					return me.getCallable(traversalPath);
				} else if (me.context.previous) {
					return me.context.previous.getCallable(traversalPath);
				} else {
					throw new Error(`Cannot find callable in globals scope for ${path.join('.')}`);
				}
			} else if (current === 'locals') {
				if (
					me.context.type === ContextType.GLOBAL || 
					me.context.type === ContextType.FUNCTION
				) {
					if (path.length === 1) {
						return Promise.resolve({
							origin: me,
							context: null
						});
					}
					return me.getCallable(traversalPath);
				} else if (me.context.previous) {
					return me.context.previous.getCallable(traversalPath);
				} else {
					throw new Error(`Cannot find callable in locals scope for ${path.join('.')}`);
				}
			} else if (me.context.previous) {
				return me.context.previous.getCallable(path);
			} else {
				throw new Error(`Cannot get callable path ${path.join('.')}`);
			}
		}

		return Promise.resolve({
			origin: me,
			context: null
		});
	}
}

export class Debugger {
	breakpoint: boolean;
	nextStep: boolean;
	lastContext: OperationContext | null;

	constructor() {
		const me = this;

		me.breakpoint = false;
		me.nextStep = false;
		me.lastContext = null;
	}

	raise(message: string, ...args: any[]) {
		throw new Error(message);
	}

	debug(message: string, ...args: any[]) {
		console.info(message, ...args);
	}

	setBreakpoint(state: boolean): Debugger {
		const me = this;
		me.breakpoint = state;
		return me;
	}

	getBreakpoint(operationContext: OperationContext): boolean {
		return operationContext.type !== ContextType.INJECTION && this.breakpoint;
	}

	next(): Debugger {
		const me = this;
		me.nextStep = true;
		return me;
	}

	resume(): Promise<void> {
		const me = this;
		
		if (!me.breakpoint) {
			return Promise.resolve();
		}

		return new Promise((resolve) => {
			const check = () => {
				if (!me.breakpoint) {
					resolve();
				} else if (me.nextStep) {
					me.nextStep = false;
					resolve();
				} else {
					setImmediate(check);
				}
			};

			setImmediate(check);
		});
	}

	interact(operationContext: OperationContext, item: Operation | Expression) {
		const me = this;
		console.warn("Debugger is not setup.");
		console.info(operationContext);
		me.lastContext = operationContext;
		me.breakpoint = false;
	}

	async run(code: string): Promise<void> {
		const me = this;

		try {
			const parser = new CodeParser(code);
			const chunk = parser.parseChunk();
			const item = await me.lastContext.cps.visit(chunk);
			const context = me.lastContext.fork({
				type: ContextType.INJECTION,
				state: ContextState.TEMPORARY
			});

			await item.run(context);
		} catch (err) {
			console.error(err);
		}
	}
}

export interface OperationContextProcessState {
	exit: boolean;
}

export interface OperationContextOptions {
	target?: string;
	isProtected?: boolean;
	type?: string;
	state?: string;
	previous?: OperationContext;
	debugger?: Debugger;
	cps?: CPS;
	processState?: OperationContextProcessState;
}

export interface OperationContextForkOptions {
	type: string;
	state: string;
	target?: string;
}

export class OperationContext {
	target: string;
	line: number;
	debugger: Debugger;
	previous: OperationContext | null;
	type: string;
	state: string;
	scope: Scope;
	isProtected: boolean;
	memory: Map<string, any>;
	cps: CPS | null;
	processState: OperationContextProcessState;

	constructor(options: OperationContextOptions) {
		const me = this;

		me.target = options.target || 'unknown';
		me.line = -1;
		me.previous = options.previous || null;
		me.type = options.type || ContextType.API;
		me.state = options.state || ContextState.DEFAULT;
		me.scope = new Scope(me);
		me.isProtected = options.isProtected || false;
		me.memory = new Map();
		me.debugger = options.debugger || new Debugger();
		me.cps = options.cps;
		me.processState = options.processState || {
			exit: false
		};
	}

	valueOf(): CustomMap {
		return this.scope.valueOf();
	}

	extend(map: Map<string, any>): OperationContext {
		const me = this;
		if (me.state === ContextState.TEMPORARY) {
			me.previous?.extend(map);
		} else {
			me.scope.extend(map);
		}
		return me;
	}

	set(path: any[], value: any): Promise<void> {
		const me = this;
		if (me.state === ContextState.TEMPORARY) {
			return me.previous?.set(path, value);
		} else {
			return me.scope.set(path, value);
		}
	}

	get(path: any[]): Promise<any> {
		const me = this;
		if (me.state === ContextState.TEMPORARY) {
			return me.previous?.get(path);
		}
		return me.scope.get(path);
	}

	getCallable(path: string[]): Promise<Callable> {
		const me = this;
		if (me.state === ContextState.TEMPORARY) {
			return me.previous?.getCallable(path);
		}
		return me.scope.getCallable(path);
	}

	setMemory(key: string, value: any): OperationContext {
		const me = this;
		me.memory.set(key, value);
		return me;
	}

	getMemory(key: string): any {
		const me = this;
		return me.memory.get(key);
	}

	fork({
		type,
		state,
		target
	}: OperationContextForkOptions): OperationContext {
		const me = this;
		const opc = new OperationContext({
			target: target || me.target,
			previous: me,
			type,
			state,
			debugger: me.debugger,
			cps: me.cps,
			processState: me.processState
		});

		if (type !== ContextType.FUNCTION) {
			if (type !== ContextType.LOOP) {
				opc.setMemory('loopContext', me.getMemory('loopContext'));
			}

			opc.setMemory('functionContext', me.getMemory('functionContext'));
		}

		return opc;
	}
}