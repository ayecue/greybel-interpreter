import { ASTFeatureImportExpression, Parser } from 'greybel-core';
import { ASTBase, ASTIdentifier } from 'greyscript-core';

import { ContextState, ContextType, OperationContext } from '../context';
import { CustomValue } from '../types/base';
import { DefaultType } from '../types/default';
import { CustomMap } from '../types/map';
import { CustomString } from '../types/string';
import { Path } from '../utils/path';
import { CPSVisit, Operation } from './operation';

export const MODULE_PROPERTY = new CustomString('module');
export const EXPORTS_PROPERTY = new CustomString('exports');
export const EXPORTS_PATH = new Path([MODULE_PROPERTY, EXPORTS_PROPERTY]);

export class Import extends Operation {
  readonly item: ASTFeatureImportExpression;
  newTarget: string;
  code: string;
  chunk: ASTBase;
  top: Operation;

  constructor(
    item: ASTFeatureImportExpression,
    target: string,
    newTarget: string,
    code: string
  ) {
    super(null, target);
    this.newTarget = newTarget;
    this.item = item;
    this.code = code;
  }

  async build(visit: CPSVisit): Promise<Operation> {
    const parser = new Parser(this.code);
    this.chunk = parser.parseChunk();
    this.top = await visit(this.chunk);
    return this;
  }

  async handle(ctx: OperationContext): Promise<CustomValue> {
    const importCtx = ctx.fork({
      type: ContextType.External,
      state: ContextState.Default,
      target: this.newTarget
    });
    importCtx.locals.scope.set(MODULE_PROPERTY, new CustomMap());

    await this.top.handle(importCtx);

    const item = importCtx.locals.scope.has(EXPORTS_PATH)
      ? importCtx.scope.get(EXPORTS_PATH)
      : DefaultType.Void;
    const identifier = this.item.name as ASTIdentifier;

    ctx.set(new CustomString(identifier.name), item);

    return DefaultType.Void;
  }
}
