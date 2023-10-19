import { ASTLiteral, ASTType } from 'miniscript-core';

import { OperationContext } from '../context';
import { CustomValue } from '../types/base';
import { CustomBoolean } from '../types/boolean';
import { DefaultType } from '../types/default';
import { CustomNumber } from '../types/number';
import { CustomString } from '../types/string';
import { CPSVisit, Operation } from './operation';

export class Literal extends Operation {
  readonly item: ASTLiteral;
  value: CustomValue;

  constructor(item: ASTLiteral, target?: string) {
    super(null, target);
    this.item = item;
  }

  build(_visit: CPSVisit): Promise<Operation> {
    switch (this.item.type) {
      case ASTType.BooleanLiteral:
        this.value = new CustomBoolean(this.item.value as boolean);
        break;
      case ASTType.StringLiteral:
        this.value = new CustomString(this.item.value as string);
        break;
      case ASTType.NumericLiteral:
        this.value = new CustomNumber(this.item.value as number);
        break;
      case ASTType.NilLiteral:
        this.value = DefaultType.Void;
        break;
      default:
        throw new Error('Unexpected literal type.');
    }

    return Promise.resolve(this);
  }

  handle(_ctx: OperationContext): Promise<CustomValue> {
    return Promise.resolve(this.value);
  }
}
