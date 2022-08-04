import OperationContext from '../context';
import { CustomValue } from '../types/generics';
import Operation, { CPSVisit } from './operation';

export default class Reference extends Operation {
  readonly value: CustomValue;

  constructor(value: CustomValue) {
    super(null, 'native');
    this.value = value;
  }

  build(_visit: CPSVisit): Promise<Reference> {
    return Promise.resolve(this);
  }

  handle(_ctx: OperationContext): Promise<CustomValue> {
    return Promise.resolve(this.value);
  }
}
