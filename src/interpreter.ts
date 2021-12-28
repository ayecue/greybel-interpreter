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
	code: string;
	api: Map<string, any>
	params: any[];
	resourceHandler: ResourceHandler;
	debugger: Debugger;

	constructor(options: InterpreterOptions) {
		const me = this;

		me.resourceHandler = options.resourceHandler || new ResourceProvider().getHandler();
		me.debugger = options.debugger || new Debugger();

		me.api = options.api || new Map();
		me.params = options.params || [];

		if (options.target) {
			me.target = options.target;
			me.code = me.resourceHandler.get(options.target);
		} else {
			me.target = 'unknown';
			me.code = options.code;
		}
	}

	digest(): Promise<any> {
		const me = this;
		const parser = new CodeParser(me.code);
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
			body: cps.visit(chunk)
		});
		
		mainContext.extend(me.api); 
		mainContext.scope.refs.set('params', cast(me.params));

		return topOperation.run(mainContext)
			.catch((err) => {
				console.error(err);
				throw err;
			});
	}
}