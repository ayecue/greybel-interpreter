import { OperationContext } from '../context';
import { CustomValue } from '../types/base';
import { CPSVisit, Operation } from './operation';

export class ReferenceOuter extends Operation {
  build(_visit: CPSVisit): Promise<ReferenceOuter> {
    return Promise.resolve(this);
  }

  handle(ctx: OperationContext): Promise<CustomValue> {
    return Promise.resolve(ctx.outer.scope);
  }
}
