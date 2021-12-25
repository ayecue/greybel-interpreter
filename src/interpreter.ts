import CPS from'./cps';
import { OperationContext, Debugger } from './context';
import { Parser as CodeParser } from 'greybel-core';
import { ResourceProvider, ResourceHandler } from './resource';
import TopOperation from './operations/top';
import { cast } from './typer';

export interface InterpreterOptions {
	target: string;
	api?: { [key: string]: any };
	params?: any[];
	resourceHandler?: ResourceHandler;
	debugger?: Debugger;
};

export default class Interpreter {
	target: string;
	api: { [key: string]: any };
	params: any[];
	resourceHandler: ResourceHandler;
	debugger: Debugger;

	constructor(options: InterpreterOptions) {
		const me = this;

		me.target = options.target;
		me.resourceHandler = options.resourceHandler || new ResourceProvider().getHandler();
		me.debugger = options.debugger || new Debugger();

		me.api = options.api || {};
		me.params = options.params || [];
	}

	digest(): Promise<any> {
		const me = this;
		const code = me.resourceHandler.get(me.target);
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
			body: cps.visit(chunk)
		});
		
		mainContext.extend({
			...me.api,
			params: cast(me.params)
		});

		return topOperation.run(mainContext)
			.catch((err) => {
				console.error(err);
				throw err;
			});
	}
}