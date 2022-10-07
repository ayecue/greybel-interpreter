import {
  ASTBase,
  ASTIdentifier,
  ASTIndexExpression,
  ASTMemberExpression,
  ASTSliceExpression,
  ASTType
} from 'greyscript-core';

import OperationContext from '../context';
import CustomValue from '../types/base';
import Defaults from '../types/default';
import CustomFunction from '../types/function';
import CustomList from '../types/list';
import CustomString from '../types/string';
import { CustomValueWithIntrinsics } from '../types/with-intrinsics';
import Path from '../utils/path';
import Operation, { CPSVisit } from './operation';

export class SliceSegment {
  readonly left: Operation;
  readonly right: Operation;

  constructor(left: Operation, right: Operation) {
    this.left = left;
    this.right = right;
  }
}

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

export type Segment =
  | SliceSegment
  | IdentifierSegment
  | IndexSegment
  | OperationSegment;

export class ResolveResult {
  readonly path: Path<CustomValue>;
  readonly handle: CustomValue;

  constructor(path: Path<CustomValue>, handle: CustomValue) {
    this.path = path;
    this.handle = handle;
  }
}

export default class Resolve extends Operation {
  readonly item: ASTBase;
  path: Array<Segment>;
  last: Segment;

  constructor(item: ASTBase, target?: string) {
    super(null, target);
    this.item = item;
  }

  async buildProcessor(node: ASTBase, visit: CPSVisit): Promise<void> {
    switch (node.type) {
      case ASTType.MemberExpression: {
        const memberExpr = node as ASTMemberExpression;
        await this.buildProcessor(memberExpr.base, visit);
        await this.buildProcessor(memberExpr.identifier, visit);
        break;
      }
      case ASTType.IndexExpression: {
        const indexExpr = node as ASTIndexExpression;
        await this.buildProcessor(indexExpr.base, visit);

        if (indexExpr.index.type === ASTType.SliceExpression) {
          const sliceExpr = indexExpr.index as ASTSliceExpression;
          const left = await visit(sliceExpr.left);
          const right = await visit(sliceExpr.right);
          const sliceSegment = new SliceSegment(left, right);
          this.path.push(sliceSegment);
        } else {
          const indexSegment = new IndexSegment(await visit(indexExpr.index));
          this.path.push(indexSegment);
        }
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
    this.last = this.path[this.path.length - 1];
    return this;
  }

  async getResult(ctx: OperationContext): Promise<ResolveResult> {
    let traversedPath = new Path<CustomValue>();
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

        traversedPath.add(new CustomString(identifierSegment.value));

        if (index === lastIndex) {
          break;
        }

        const previous = handle;

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

        if (handle instanceof CustomFunction) {
          handle = await handle.run(previous || Defaults.Void, [], ctx);
        }

        traversedPath = new Path<CustomValue>();
      } else if (current instanceof IndexSegment) {
        const indexSegment = current as IndexSegment;
        const indexValue = await indexSegment.op.handle(ctx);

        traversedPath.add(indexValue);

        if (index === lastIndex) {
          break;
        }

        const previous = handle;

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

        if (handle instanceof CustomFunction) {
          handle = await handle.run(previous || Defaults.Void, [], ctx);
        }

        traversedPath = new Path<CustomValue>();
      } else if (current instanceof SliceSegment) {
        const sliceSegment = current as SliceSegment;
        const left = await sliceSegment.left.handle(ctx);
        const right = await sliceSegment.right.handle(ctx);

        if (handle instanceof CustomList || handle instanceof CustomString) {
          handle = handle.slice(left, right);
        } else {
          throw new Error(
            `Unexpected slice attempt. ${handle.getCustomType()} does not seem to support slicing.`
          );
        }
      }
    }

    return new ResolveResult(traversedPath, handle);
  }

  async handle(
    ctx: OperationContext,
    result: ResolveResult = null,
    autoCall: boolean = true
  ): Promise<CustomValue> {
    if (result === null) {
      result = await this.getResult(ctx);
    }

    if (result.handle !== Defaults.Void) {
      if (result.path.count() === 0) {
        if (autoCall && result.handle instanceof CustomFunction) {
          return result.handle.run(Defaults.Void, [], ctx);
        }

        return result.handle;
      }

      const customValueCtx = result.handle as CustomValueWithIntrinsics;
      const child = customValueCtx.get(result.path);

      if (autoCall && child instanceof CustomFunction) {
        return child.run(customValueCtx, [], ctx);
      }

      return child;
    }

    const handle = ctx.get(result.path);

    if (autoCall && handle instanceof CustomFunction) {
      return handle.run(Defaults.Void, [], ctx);
    }

    return handle;
  }
}
