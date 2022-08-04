import {
  ASTBase,
  ASTIdentifier,
  ASTIndexExpression,
  ASTMemberExpression,
  ASTType
} from 'greyscript-core';

import OperationContext from '../context';
import Defaults from '../types/default';
import { CustomValue, CustomValueWithIntrinsics } from '../types/generics';
import Path from '../utils/path';
import Operation, { CPSVisit } from './operation';

export class IdentifierSegment {
  readonly value: string;

  constructor(value: string) {
    this.value = value;
  }
}

export class IndexSegment {
  readonly op: Operation;

  constructor(op: Operation) {
    this.op = op;
  }
}

export class OperationSegment {
  readonly op: Operation;

  constructor(op: Operation) {
    this.op = op;
  }
}

export type Segment = IdentifierSegment | IndexSegment | OperationSegment;

export class ResolveResult {
  readonly path: Path<string>;
  readonly handle: CustomValue;

  constructor(path: Path<string>, handle: CustomValue) {
    this.path = path;
    this.handle = handle;
  }
}

export default class Resolve extends Operation {
  readonly item: ASTBase;
  path: Array<Segment>;

  constructor(item: ASTBase, target?: string) {
    super(null, target);
    this.item = item;
  }

  async buildProcessor(node: ASTBase, visit: CPSVisit): Promise<void> {
    switch (node.type) {
      case ASTType.MemberExpression: {
        const memberExpr = node as ASTMemberExpression;
        this.buildProcessor(memberExpr.base, visit);
        this.buildProcessor(memberExpr.identifier, visit);
        break;
      }
      case ASTType.IndexExpression: {
        const indexExpr = node as ASTIndexExpression;
        this.buildProcessor(indexExpr.base, visit);
        const indexSegment = new IndexSegment(await visit(indexExpr.index));
        this.path.push(indexSegment);
        break;
      }
      case ASTType.Identifier: {
        const identifier = node as ASTIdentifier;
        const identifierSegment = new IdentifierSegment(identifier.name);
        this.path.push(identifierSegment);
        break;
      }
      default: {
        const opSegment = new OperationSegment(await visit(node));
        this.path.push(opSegment);
        break;
      }
    }
  }

  async build(visit: CPSVisit): Promise<Resolve> {
    this.path = [];
    await this.buildProcessor(this.item, visit);
    return this;
  }

  async getResult(ctx: OperationContext): Promise<ResolveResult> {
    let traversedPath = new Path<string>();
    let handle: CustomValue = Defaults.Void;
    const maxIndex = this.path.length;
    const lastIndex = maxIndex - 1;

    for (let index = 0; index < maxIndex; index++) {
      const current = this.path[index];

      if (current instanceof OperationSegment) {
        const opSegment = current as OperationSegment;
        handle = await opSegment.op.handle(ctx);
      } else if (current instanceof IdentifierSegment) {
        const identifierSegment = current as IdentifierSegment;

        traversedPath.add(identifierSegment.value);

        if (index === lastIndex) {
          break;
        }

        if (handle !== Defaults.Void) {
          if (handle instanceof CustomValueWithIntrinsics) {
            const customValueCtx = handle as CustomValueWithIntrinsics;
            handle = customValueCtx.get(traversedPath);
          } else {
            throw new Error('Handle has no properties.');
          }
        } else {
          handle = ctx.get(traversedPath);
        }

        traversedPath = new Path<string>();
      } else if (current instanceof IndexSegment) {
        const indexSegment = current as IndexSegment;
        const indexValue = await indexSegment.op.handle(ctx);

        traversedPath.add(indexValue.toString());

        if (index === lastIndex) {
          break;
        }

        if (handle !== Defaults.Void) {
          if (handle instanceof CustomValueWithIntrinsics) {
            const customValueCtx = handle as CustomValueWithIntrinsics;
            handle = customValueCtx.get(traversedPath);
          } else {
            throw new Error('Handle has no properties.');
          }
        } else {
          handle = ctx.get(traversedPath);
        }

        traversedPath = new Path<string>();
      }
    }

    return new ResolveResult(traversedPath, handle);
  }

  async handle(
    ctx: OperationContext,
    result: ResolveResult = null
  ): Promise<CustomValue> {
    if (result === null) {
      result = await this.getResult(ctx);
    }

    if (result.handle !== Defaults.Void) {
      if (result.path.count() === 0) {
        return result.handle;
      }

      const customValueCtx = result.handle as CustomValueWithIntrinsics;
      return customValueCtx.get(result.path);
    }

    return ctx.get(result.path);
  }
}
