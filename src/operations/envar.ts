import { ASTFeatureEnvarExpression } from 'greybel-core';

import context from '../context';
import CustomValue from '../types/base';
import CustomString from '../types/string';
import Operation, { CPSVisit } from './operation';

export default class EnvarExpression extends Operation {
  readonly item: ASTFeatureEnvarExpression;

  constructor(item: ASTFeatureEnvarExpression, target?: string) {
    super(null, target);
    this.item = item;
  }

  build(_visit: CPSVisit): Promise<Operation> {
    return Promise.resolve(this);
  }

  handle(ctx: context): Promise<CustomValue> {
    if (ctx.environmentVariables.has(this.item.name)) {
      return Promise.resolve(
        new CustomString(ctx.environmentVariables.get(this.item.name)!)
      );
    }

    throw new Error('Unknown environment variable.');
  }
}
