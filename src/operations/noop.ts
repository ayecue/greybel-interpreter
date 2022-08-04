import { ASTBase } from 'greyscript-core';

import context from '../context';
import Defaults from '../types/default';
import { CustomValue } from '../types/generics';
import Operation, { CPSVisit } from './operation';

export default class Noop extends Operation {
  constructor(item?: ASTBase, target?: string) {
    super(null, target);
  }

  build(_visit: CPSVisit): Promise<Operation> {
    return Promise.resolve(this);
  }

  handle(_ctx: context): Promise<CustomValue> {
    return Promise.resolve(Defaults.Void);
  }
}
