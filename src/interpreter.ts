import CPS from'./cps';
import {
	OperationContext,
	Debugger,
	ContextType,
	ContextState
} from './context';
import { Parser as CodeParser } from 'greybel-core';
import { ResourceProvider, ResourceHandler } from './resource';
import { cast } from './typer';
import EventEmitter from 'events';

export interface InterpreterOptions {
	target?: string;
	api?: Map<string, any>;
	params?: any[];
	resourceHandler?: ResourceHandler;
	debugger?: Debugger;
};

export default class Interpreter extends EventEmitter {
	target: string;
	api: Map<string, any>
	params: any[];
	resourceHandler: ResourceHandler;
	debugger: Debugger;
	apiContext: OperationContext;
	globalContext: OperationContext;
	cps: CPS;

	constructor(options: InterpreterOptions) {
		super();

		const me = this;

		me.resourceHandler = options.resourceHandler || new ResourceProvider().getHandler();
		me.debugger = options.debugger || new Debugger();

		me.api = options.api || new Map();
		me.params = options.params || [];

		me.setTarget(options.target || 'unknown');
	}

	setTarget(target: string): Interpreter {
		const me = this;

		me.target = target;

		me.cps = new CPS({
			target: me.target,
			resourceHandler: me.resourceHandler
		});

		me.apiContext = new OperationContext({
			target: me.target,
			isProtected: true,
			debugger: me.debugger,
			cps: me.cps
		});

		me.globalContext = me.apiContext.fork({
			type: ContextType.GLOBAL,
			state: ContextState.DEFAULT
		});

		return me;
	}

	setDebugger(dbgr: Debugger): Interpreter {
		const me = this;

		me.debugger = dbgr;
		me.apiContext.debugger = dbgr;
		me.globalContext.debugger = dbgr;

		return me;
	}

	async inject(code: string, context?: OperationContext): Promise<Interpreter> {
		const me = this;

		try {
			const parser = new CodeParser(code);
			const chunk = parser.parseChunk();
			const body = await me.cps.visit(chunk);
			const injectionCtx = (context || me.globalContext).fork({
				type: ContextType.CALL,
				state: ContextState.TEMPORARY,
				injected: true
			});

			await body.run(injectionCtx);
		} catch (err) {
			me.debugger.raise(err);
		}

		return me;
	}

	async injectInLastContext(code: string): Promise<Interpreter> {
		const me = this;
		const last = me.apiContext.getLastActive();

		if (me.apiContext.isPending()) {
			return me.inject(code, last);
		}

		return me;
	}

	async digest(customCode?: string): Promise<Interpreter> {
		const me = this;

		if (me.apiContext.isPending()) {
			return Promise.reject(new Error('Process already running.'));
		}

		const code = customCode || (await me.resourceHandler.get(me.target));
		const parser = new CodeParser(code);
		const chunk = parser.parseChunk();
		const body = await me.cps.visit(chunk);

		me.apiContext.extend(me.api);
		me.globalContext.scope.value.set('params', cast(me.params));

		me.emit('setup', me);

		try {
			me.apiContext.setPending(true);
			const process = body.run(me.globalContext);
			me.emit('start');
			await process;
		} catch (err) {
			me.debugger.raise(err);
		} finally {
			setTimeout(() => {
				me.apiContext.setPending(false);
				me.emit('exit', me);
			}, 100);
		}

		return me;
	}

	exit(): Promise<OperationContext> {
		const me = this;

		try {
			return me.apiContext.exit();
		} catch (err) {
			me.debugger.raise(err);
		}
	}
}