import { OperationContext } from '../context';
import { CustomValue } from '../types/base';
import { CPSVisit, Operation } from './operation';

export class ReferenceLocals extends Operation {
  build(_visit: CPSVisit): Promise<ReferenceLocals> {
    return Promise.resolve(this);
  }

  handle(ctx: OperationContext): Promise<CustomValue> {
    return Promise.resolve(ctx.locals.scope);
  }
}
