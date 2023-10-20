import { ASTBase } from 'greyscript-core';

import { OperationContext } from '../context';
import { CustomValue } from '../types/base';

export interface CPSVisit {
  /* eslint-disable no-use-before-define */
  (item: ASTBase, isWithinResolve?: boolean): Promise<Operation>;
}

export abstract class Operation {
  readonly item: ASTBase;
  readonly target: string;

  constructor(item: ASTBase, target: string = null) {
    this.item = item;
    this.target = target;
  }

  abstract build(visit: CPSVisit): Promise<Operation>;
  abstract handle(ctx: OperationContext): Promise<CustomValue>;
}

export abstract class OperationBlock extends Operation {}
