import {
  ASTElseClause,
  ASTIfClause,
  ASTIfStatement,
  ASTType
} from 'greyscript-core';

import { OperationContext } from '../context';
import { CustomValue } from '../types/base';
import { CustomBoolean } from '../types/boolean';
import { DefaultType } from '../types/default';
import { Block } from './block';
import { CPSVisit, Operation, OperationBlock } from './operation';
import { Reference } from './reference';

export class Clause {
  readonly condition: Operation;
  readonly block: Block;

  constructor(condition: Operation, block: Block) {
    this.condition = condition;
    this.block = block;
  }
}

export class IfStatement extends OperationBlock {
  readonly item: ASTIfStatement;
  clauses: Array<Clause>;

  constructor(item: ASTIfStatement, target?: string) {
    super(null, target);
    this.item = item;
  }

  async buildIfClause(node: ASTIfClause, visit: CPSVisit) {
    const condition = await visit(node.condition);
    const stack = await Promise.all(node.body.map((child) => visit(child)));
    const block = new Block(this.item, stack);
    this.clauses.push(new Clause(condition, block));
  }

  async buildElseClause(node: ASTElseClause, visit: CPSVisit) {
    const condition = new Reference(new CustomBoolean(true));
    const stack = await Promise.all(node.body.map((child) => visit(child)));
    const block = new Block(this.item, stack);
    this.clauses.push(new Clause(condition, block));
  }

  async build(visit: CPSVisit): Promise<Operation> {
    this.clauses = [];

    for (let index = 0; index < this.item.clauses.length; index++) {
      const child = this.item.clauses[index];

      switch (child.type) {
        case ASTType.IfClause:
        case ASTType.IfShortcutClause:
        case ASTType.ElseifClause:
        case ASTType.ElseifShortcutClause:
          await this.buildIfClause(child as ASTIfClause, visit);
          break;
        case ASTType.ElseClause:
        case ASTType.ElseShortcutClause:
          await this.buildElseClause(child as ASTElseClause, visit);
          break;
      }
    }

    return this;
  }

  async handle(ctx: OperationContext): Promise<CustomValue> {
    for (let index = 0; index < this.clauses.length; index++) {
      const clause = this.clauses[index];
      const clauseResult = await ctx.step(clause.condition);

      if (clauseResult.toTruthy()) {
        await clause.block.handle(ctx);
        break;
      }
    }

    return DefaultType.Void;
  }
}
