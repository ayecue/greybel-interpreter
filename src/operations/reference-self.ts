import { OperationContext } from '../context';
import { CustomValue } from '../types/base';
import { CPSVisit, Operation } from './operation';

export class ReferenceSelf extends Operation {
  build(_visit: CPSVisit): Promise<ReferenceSelf> {
    return Promise.resolve(this);
  }

  handle(ctx: OperationContext): Promise<CustomValue> {
    return Promise.resolve(ctx.functionState.context);
  }
}
