import { ASTListConstructorExpression, ASTListValue } from 'greyscript-core';

import { OperationContext } from '../context';
import { CustomValue } from '../types/base';
import { CustomList } from '../types/list';
import { CPSVisit, Operation } from './operation';

export class List extends Operation {
  readonly item: ASTListConstructorExpression;
  fields: Array<Operation>;

  constructor(item: ASTListConstructorExpression, target?: string) {
    super(null, target);
    this.item = item;
  }

  async build(visit: CPSVisit): Promise<Operation> {
    this.fields = await Promise.all(
      this.item.fields.map((child) => {
        const listValue = child as ASTListValue;
        return visit(listValue.value);
      })
    );
    return this;
  }

  async handle(ctx: OperationContext): Promise<CustomValue> {
    const fields: Array<CustomValue> = [];

    for (let index = 0; index < this.fields.length; index++) {
      const child = this.fields[index];

      fields.push(await child.handle(ctx));
    }

    return new CustomList(fields);
  }
}
