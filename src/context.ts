import CustomBoolean from './custom-types/boolean';
import CustomNumber from './custom-types/number';
import CustomString from './custom-types/string';
import CustomNil from './custom-types/nil';
import CustomMap from './custom-types/map';
import CustomList from './custom-types/list';
import { Operation } from './types/operation';
import { Expression } from './types/expression';
import { CustomObjectType, Callable } from './types/custom-type';
import { Parser as CodeParser, ASTBase } from 'greybel-core';
import { ASTPosition } from 'greyscript-core';
import CPS from './cps';

export enum ContextType {
	API = 'API',
	GLOBAL = 'GLOBAL',
	FUNCTION = 'FUNCTION',
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
			if (current === 'locals') {
				return me.context.locals.set(traversalPath, value);
			} else if (current === 'globals') {
				return me.context.globals.set(traversalPath, value);
			} else if (me.context.locals != null) {
				return CustomMap.prototype.set.call(me.context.locals, path, value);
			} else {
				throw new Error(`Cannot set path ${path.join('.')}`);
			}
		}
	}

	get(path: string[]): Promise<any> {
		const me = this;
		const traversalPath = [].concat(path);
		const current = traversalPath.shift();

		if (current != null) {
			if (current === 'locals') {
				return traversalPath.length === 0
					? Promise.resolve(me.context.locals)
					: me.context.locals.get(traversalPath);
			} else if (current === 'globals') {
				return traversalPath.length === 0
					? Promise.resolve(me.context.globals)
					: me.context.globals.get(traversalPath);
			} else if (me.context.locals?.value.has(current)) {
				return CustomMap.prototype.get.call(me.context.locals, path);
			} else if (me.context.globals?.value.has(current)) {
				return CustomMap.prototype.get.call(me.context.globals, path);
			} else if (me.context.api?.value.has(current)) {
				return CustomMap.prototype.get.call(me.context.api, path);
			} else if (me.value.has(current)) {
				return super.get(path);
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
			if (current === 'locals') {
				return me.context.locals.getCallable(traversalPath);
			} else if (current === 'globals') {
				return me.context.globals.getCallable(traversalPath);
			} else if (me.context.locals?.value.has(current)) {
				return CustomMap.prototype.getCallable.call(me.context.locals, path);
			} else if (me.context.globals?.value.has(current)) {
				return CustomMap.prototype.getCallable.call(me.context.globals, path);
			} else if (me.context.api?.value.has(current)) {
				return CustomMap.prototype.getCallable.call(me.context.api, path);
			} else {
				return super.getCallable(path);
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
		return !operationContext.injected && this.breakpoint;
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

	interact(operationContext: OperationContext, item: ASTBase) {
		const me = this;
		console.warn("Debugger is not setup.");
		console.info(operationContext);
		me.breakpoint = false;
	}
}

export interface OperationContextProcessState {
	exit: boolean;
	pending: boolean;
	last: OperationContext | null;
}

export interface OperationContextOptions {
	target?: string;
	isProtected?: boolean;
	injected?: boolean;
	type?: ContextType;
	state?: ContextState;
	previous?: OperationContext;
	debugger?: Debugger;
	cps?: CPS;
	processState?: OperationContextProcessState;
}

export interface OperationContextForkOptions {
	type: ContextType;
	state: ContextState;
	target?: string;
	injected?: boolean;
}

export class OperationContext {
	target: string;
	stackItem: ASTBase | null;
	debugger: Debugger;
	previous: OperationContext | null;
	type: ContextType;
	state: ContextState;
	scope: Scope;
	memory: Map<string, any>;
	cps: CPS | null;
	processState: OperationContextProcessState;

	isProtected: boolean;
	injected: boolean;

	api: Scope | null;
	locals: Scope | null;
	globals: Scope | null;

	constructor(options: OperationContextOptions) {
		const me = this;

		me.target = options.target || 'unknown';
		me.stackItem = null;
		me.previous = options.previous || null;
		me.type = options.type || ContextType.API;
		me.state = options.state || ContextState.DEFAULT;
		me.scope = new Scope(me);
		me.isProtected = options.isProtected || false;
		me.injected = options.injected || false;
		me.memory = new Map();
		me.debugger = options.debugger || new Debugger();
		me.cps = options.cps;
		me.processState = options.processState || {
			exit: false,
			pending: false,
			last: null
		};

		me.api = me.lookupAPI();
		me.globals = me.lookupGlobals();
		me.locals = me.lookupLocals();
	}

	step(item: ASTBase): Promise<void> {
		const me = this;
		const dbgr = me.debugger;

		me.stackItem = item;
		me.setLastActive(me);

		if (dbgr.getBreakpoint(me)) {
			dbgr.interact(me, item);
			return dbgr.resume();
		}

		return Promise.resolve();
	}

	setLastActive(opc: OperationContext): OperationContext {
		const me = this;
		if (!opc.injected) {
			me.processState.last = opc;
		}
		return me;
	}

	getLastActive(): OperationContext | null {
		return this.processState.last;
	}

	isExit(): boolean {
		return this.processState.exit;
	}

	exit(): Promise<OperationContext> {
		const me = this;
		const state = me.processState;

		if (state.pending) {
			state.exit = true;

			return new Promise((resolve) => {
				setImmediate(() => {
					if (!state.pending) {
						state.exit = false;
						resolve(me);
					}
				});
			});
		}

		return Promise.reject(new Error('No running process found.'));
	}

	isPending(): boolean {
		return this.processState.pending;
	}

	setPending(pending: boolean): OperationContext {
		const me = this;
		me.processState.pending = pending;
		return me;
	}

	lookupType(validate: (type: ContextType) => boolean): Scope {
		const me = this;

		if (validate(me.type)) {
			return me.scope;
		}

		let current = me.previous;

		while (current) {
			if (validate(current.type)) {
				return current.scope;
			}

			current = current.previous;
		}

		return null;
	}

	lookupAPI() {
		return this.lookupType((type: ContextType) => [ContextType.API].includes(type));
	}

	lookupGlobals(): Scope {
		return this.lookupType((type: ContextType) => [ContextType.GLOBAL].includes(type));
	}

	lookupLocals(): Scope {
		return this.lookupType((type: ContextType) => [ContextType.GLOBAL, ContextType.FUNCTION].includes(type));
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
		target,
		injected
	}: OperationContextForkOptions): OperationContext {
		const me = this;
		const opc = new OperationContext({
			target: target || me.target,
			previous: me,
			type,
			state,
			debugger: me.debugger,
			cps: me.cps,
			processState: me.processState,
			injected: injected || me.injected
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