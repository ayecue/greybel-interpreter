import { ASTMapConstructorExpression, ASTMapKeyString } from 'greyscript-core';

import context from '../context';
import { CustomValue } from '../types/generics';
import CustomMap from '../types/map';
import CustomString from '../types/string';
import Operation, { CPSVisit } from './operation';

export default class MapOperation extends Operation {
  readonly item: ASTMapConstructorExpression;
  fields: Map<string, Operation>;

  constructor(item: ASTMapConstructorExpression, target?: string) {
    super(null, target);
    this.item = item;
  }

  async build(visit: CPSVisit): Promise<Operation> {
    this.fields = new Map<string, Operation>();
    const defers = this.item.fields.map(async (child) => {
      const mapKeyString = child as ASTMapKeyString;
      this.fields.set(mapKeyString.key, await visit(mapKeyString.value));
    });
    await Promise.all(defers);
    return this;
  }

  async handle(ctx: context): Promise<CustomValue> {
    const newMap = new Map<CustomValue, CustomValue>();

    for (const [key, value] of this.fields) {
      newMap.set(new CustomString(key), await value.handle(ctx));
    }

    return new CustomMap(newMap);
  }
}
