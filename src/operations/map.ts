import { ASTMapConstructorExpression, ASTMapKeyString } from 'greyscript-core';

import { OperationContext } from '../context';
import { CustomValue } from '../types/base';
import { CustomMap } from '../types/map';
import { ObjectValue } from '../utils/object-value';
import { CPSVisit, Operation } from './operation';

export class MapOperation extends Operation {
  readonly item: ASTMapConstructorExpression;
  fields: Map<Operation, Operation>;

  constructor(item: ASTMapConstructorExpression, target?: string) {
    super(null, target);
    this.item = item;
  }

  async build(visit: CPSVisit): Promise<Operation> {
    this.fields = new Map<Operation, Operation>();
    const defers = this.item.fields.map(async (child) => {
      const mapKeyString = child as ASTMapKeyString;
      this.fields.set(
        await visit(mapKeyString.key),
        await visit(mapKeyString.value)
      );
    });
    await Promise.all(defers);
    return this;
  }

  async handle(ctx: OperationContext): Promise<CustomValue> {
    const newMap = new ObjectValue();

    for (const [key, value] of this.fields) {
      newMap.set(await key.handle(ctx), await value.handle(ctx));
    }

    return new CustomMap(newMap);
  }
}
