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
	LOOP = 'LOOP',
	MAP = 'MAP',
	CALL = 'CALL'
}

export enum ContextState {
	TEMPORARY = 'TEMPORARY',
	DEFAULT = 'DEFAULT'
}

export type ScopeRefs = { [key: string]: any };

export class Scope {
	context: OperationContext;
	refs: ScopeRefs;

	constructor(context: OperationContext) {
		const me = this;

		me.context = context;
		me.refs = {};
	}

	valueOf(): ScopeRefs {
		return this.refs;
	}

	extend(map: ScopeRefs = {}): Scope {
		const me = this;
		me.refs = {
			...me.refs,
			...map
		};
		return me;
	}

	async set(path: any[], value: any): Promise<void> {
		const me = this;
		const traversalPath = [].concat(path);
		const refs = me.refs;
		const last = traversalPath.pop();
		const current = traversalPath.shift();
		let origin = refs;

		if (current != null) {
			if (current in origin) {
				origin = origin[current];

				if (
					origin instanceof CustomObjectType ||
					origin instanceof Scope
				) {
					return origin.set(traversalPath.concat([last]), value);
				}
			} else if (me.context.previous && !me.context.previous.isProtected) {
				me.context.previous.set(path, value);
				return;
			} else if (traversalPath.length > 0) {
				throw new Error(`Cannot set path ${path.join('.')}`);
			}
		}
		
		if (
			origin &&
			!(origin instanceof CustomBoolean) &&
			!(origin instanceof CustomString) &&
			!(origin instanceof CustomNumber) &&
			!(origin instanceof CustomNil)
		) {
			origin[last] = value; 
		} else {
			throw new Error(`Cannot set path ${path.join('.')}`);
		}
	}

	async get(path: any[]): Promise<any> {
		const me = this;
		const traversalPath = [].concat(path);
		const refs = me.refs;
		const current = traversalPath.shift();
		let context;
		let origin = refs;

		if (current != null) {
			if (current in origin) {
				context = origin;
				origin = origin[current];
				
				if (
					traversalPath.length > 0 &&
					(
						origin instanceof CustomObjectType ||
						origin instanceof Scope
					)
				) {
					return origin.get(traversalPath);
				}
			} else if (me.context.previous) {
				return me.context.previous.get(path);
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
		const refs = me.refs;
		const current = traversalPath.shift();
		let origin = refs;
		let context;

		if (current != null) {
			if (current in origin) {
				context = origin;
				origin = origin[current];

				if (
					origin instanceof CustomObjectType ||
					origin instanceof Scope
				) {
					return origin.getCallable(traversalPath);
				}
			} else if (me.context.previous) {
				return me.context.previous.getCallable(path);
			} else {
				throw new Error(`Cannot get path ${path.join('.')}`);
			}
		}

		return {
			origin: origin,
			context: context
		};
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

	getBreakpoint(): boolean {
		return this.breakpoint;
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
			const item = me.lastContext.cps.visit(chunk);
			const context = me.lastContext.fork(
				ContextType.INJECTION,
				ContextState.TEMPORARY
			);

			await item.run(context);
		} catch (err) {
			console.error(err);
		}
	}
}

export interface OperationContextOptions {
	isProtected?: boolean;
	type?: string;
	state?: string;
	previous?: OperationContext;
	debugger?: Debugger;
	cps?: CPS;
}

export class OperationContext {
	debugger: Debugger;
	previous: OperationContext | null;
	type: string;
	state: string;
	scope: Scope;
	isProtected: boolean;
	memory: Map<string, any>;
	cps: CPS | null;

	constructor(options: OperationContextOptions) {
		const me = this;

		me.previous = options.previous || null;
		me.type = options.type || ContextType.API;
		me.state = options.state || ContextState.DEFAULT;
		me.scope = new Scope(me);
		me.isProtected = options.isProtected || false;
		me.memory = new Map();
		me.debugger = options.debugger || new Debugger();
		me.cps = options.cps;
	}

	valueOf(): ScopeRefs {
		return this.scope.valueOf();
	}

	extend(map: ScopeRefs): OperationContext {
		const me = this;
		if (me.state === ContextState.TEMPORARY) {
			me.previous?.extend(map);
		} else {
			me.scope.extend(map);
		}
		return me;
	}

	async set(path: any[], value: any): Promise<OperationContext> {
		const me = this;
		if (me.state === ContextState.TEMPORARY) {
			await me.previous?.set(path, value);
		} else {
			await me.scope.set(path, value);
		}
		return me;
	}

	get(path: any[]): any {
		const me = this;
		if (me.state === ContextState.TEMPORARY) {
			return me.previous?.get(path);
		}
		return me.scope.get(path);
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

	getCallable(path: string[]): Promise<Callable> {
		const me = this;
		if (me.state === ContextState.TEMPORARY) {
			return me.previous?.getCallable(path);
		}
		return me.scope.getCallable(path);
	}

	fork(type: string, state: string): OperationContext {
		const me = this;
		const opc = new OperationContext({
			previous: me,
			type,
			state,
			debugger: me.debugger,
			cps: me.cps
		});

		if (me.type === ContextType.FUNCTION || me.type === ContextType.GLOBAL) {
			opc.extend({
				locals: opc.scope
			});
		}

		if (type !== ContextType.FUNCTION) {
			if (type !== ContextType.LOOP) {
				opc.setMemory('loopContext', me.getMemory('loopContext'));
			}

			opc.setMemory('functionContext', me.getMemory('functionContext'));
		}

		return opc;
	}
}