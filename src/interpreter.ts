import CPS from'./cps';
import { OperationContext, Debugger } from './context';
import { Parser as CodeParser } from 'greybel-core';
import { ResourceProvider, ResourceHandler } from './resource';
import TopOperation from './operations/top';
import { cast } from './typer';

export interface InterpreterOptions {
	target?: string;
	code?: string;
	api?: Map<string, any>;
	params?: any[];
	resourceHandler?: ResourceHandler;
	debugger?: Debugger;
};

export default class Interpreter {
	target: string;
	code: string | null;
	api: Map<string, any>
	params: any[];
	resourceHandler: ResourceHandler;
	debugger: Debugger;
	context: OperationContext | null;

	constructor(options: InterpreterOptions) {
		const me = this;

		me.resourceHandler = options.resourceHandler || new ResourceProvider().getHandler();
		me.debugger = options.debugger || new Debugger();

		me.api = options.api || new Map();
		me.params = options.params || [];
		me.context = null;

		if (options.target) {
			me.target = options.target;
			me.code = null;
		} else {
			me.target = 'unknown';
			me.code = options.code;
		}
	}

	async digest(): Promise<any> {
		const me = this;
		const code = me.code || (await me.resourceHandler.get(me.target));
		const parser = new CodeParser(code);
		const chunk = parser.parseChunk();
		const cps = new CPS({
			target: me.target,
			resourceHandler: me.resourceHandler
		});
		const mainContext = new OperationContext({
			isProtected: true,
			debugger: me.debugger,
			cps
		});
		const topOperation = new TopOperation(null, {
			body: await cps.visit(chunk)
		});
		
		mainContext.extend(me.api); 
		mainContext.scope.refs.set('params', cast(me.params));

		me.context = mainContext;

		return topOperation.run(mainContext)
			.catch((err) => {
				console.error(err);
				throw err;
			});
	}

	exit() {
		const me = this;

		if (me.context == null) {
			throw new Error('Unexpected exit signal.');
		}

		me.context.processState.exit = true;
	}
}