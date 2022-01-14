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

export class Scope {
	context: OperationContext;
	refs: Map<string, any>;

	constructor(context: OperationContext) {
		const me = this;

		me.context = context;
		me.refs = new Map();
	}

	valueOf(): Map<string, any> {
		return this.refs;
	}

	extend(map: Map<string, any> = new Map()): Scope {
		const me = this;
		me.refs = new Map([
			...me.refs.entries(),
			...map.entries()
		]);
		return me;
	}

	async set(path: string[], value: any): Promise<void> {
		const me = this;
		const traversalPath = [].concat(path);
		const refs = me.refs;
		const last = traversalPath.pop();
		const current = traversalPath.shift();
		let origin = refs;

		if (current != null) {
			if (origin.has(current)) {
				origin = origin.get(current);

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
			origin.set(last, value); 
		} else {
			throw new Error(`Cannot set path ${path.join('.')}`);
		}
	}

	async get(path: string[]): Promise<any> {
		const me = this;
		const traversalPath = [].concat(path);
		const refs = me.refs;
		const current = traversalPath.shift();
		let context;
		let origin = refs;

		if (current != null) {
			if (origin.has(current)) {
				context = origin;
				origin = origin.get(current);
				
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

	async getCallable(path: string[]): Promise<Callable> {
		const me = this;
		const traversalPath = [].concat(path);
		const refs = me.refs;
		const current = traversalPath.shift();
		let origin = refs;
		let context;

		if (current != null) {
			if (origin.has(current)) {
				context = origin;
				origin = origin.get(current);

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

	valueOf(): Map<string, any> {
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

		if (me.type === ContextType.FUNCTION || me.type === ContextType.GLOBAL) {
			opc.scope.refs.set('locals', opc.scope);
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