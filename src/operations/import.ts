import { ASTFeatureImportExpression, Parser } from 'greybel-core';
import { ASTBase, ASTIdentifier } from 'greyscript-core';

import context, { ContextState, ContextType } from '../context';
import Defaults from '../types/default';
import { CustomValue } from '../types/generics';
import CustomMap from '../types/map';
import Operation, { CPSVisit } from './operation';

export default class Include extends Operation {
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
      state: ContextState.Temporary,
      target: this.target
    });
    const moduleMap = new CustomMap();
    importCtx.set('module', moduleMap);

    await this.top.handle(importCtx);

    const item = moduleMap.has('exports')
      ? moduleMap.get('exports')
      : Defaults.Void;
    const identifier = this.item.name as ASTIdentifier;

    ctx.set(identifier.name, item);

    return Defaults.Void;
  }
}
