import { ASTFeatureImportExpression, Parser } from 'greybel-core';
import { ASTBase, ASTIdentifier } from 'greyscript-core';

import context, { ContextState, ContextType } from '../context';
import CustomValue from '../types/base';
import Defaults from '../types/default';
import CustomMap from '../types/map';
import CustomString from '../types/string';
import Path from '../utils/path';
import Operation, { CPSVisit } from './operation';

export const MODULE_PROPERTY = new CustomString('module');
export const EXPORTS_PROPERTY = new CustomString('exports');
export const EXPORTS_PATH = new Path([MODULE_PROPERTY, EXPORTS_PROPERTY]);

export default class Import extends Operation {
  readonly item: ASTFeatureImportExpression;
  code: string;
  chunk: ASTBase;
  top: Operation;

  constructor(item: ASTFeatureImportExpression, target: string, code: string) {
    super(null, target);
    this.item = item;
    this.code = code;
  }

  async build(visit: CPSVisit): Promise<Operation> {
    const parser = new Parser(this.code);
    this.chunk = parser.parseChunk();
    this.top = await visit(this.chunk);
    return this;
  }

  async handle(ctx: context): Promise<CustomValue> {
    const importCtx = ctx.fork({
      type: ContextType.External,
      state: ContextState.Default,
      target: this.target
    });
    importCtx.locals.scope.set(MODULE_PROPERTY, new CustomMap());

    await this.top.handle(importCtx);

    const item = importCtx.locals.scope.has(EXPORTS_PATH)
      ? importCtx.scope.get(EXPORTS_PATH)
      : Defaults.Void;
    const identifier = this.item.name as ASTIdentifier;

    ctx.set(new CustomString(identifier.name), item);

    return Defaults.Void;
  }
}
