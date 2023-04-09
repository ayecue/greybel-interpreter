import context from '../context';
import CustomValue from '../types/base';
import Defaults from '../types/default';
import Operation, { CPSVisit } from './operation';

export default class Noop extends Operation {
  build(_visit: CPSVisit): Promise<Operation> {
    return Promise.resolve(this);
  }

  handle(_ctx: context): Promise<CustomValue> {
    return Promise.resolve(Defaults.Void);
  }
}
