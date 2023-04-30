import { OperationContext } from '../context';
import { CustomValue } from '../types/base';
import { DefaultType } from '../types/default';
import { CPSVisit, Operation } from './operation';

export class Noop extends Operation {
  build(_visit: CPSVisit): Promise<Operation> {
    return Promise.resolve(this);
  }

  handle(_ctx: OperationContext): Promise<CustomValue> {
    return Promise.resolve(DefaultType.Void);
  }
}
