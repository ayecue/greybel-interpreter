import { OperationContext } from '../context';
import { CustomValue } from '../types/base';
import { CPSVisit, Operation } from './operation';

export class ReferenceGlobals extends Operation {
  build(_visit: CPSVisit): Promise<ReferenceGlobals> {
    return Promise.resolve(this);
  }

  handle(ctx: OperationContext): Promise<CustomValue> {
    return Promise.resolve(ctx.globals.scope);
  }
}
