import {
  ASTBase,
  ASTIdentifier,
  ASTIndexExpression,
  ASTMemberExpression,
  ASTSliceExpression,
  ASTType
} from 'greyscript-core';

import { OperationContext } from '../context';
import { CustomValue } from '../types/base';
import { DefaultType } from '../types/default';
import { CustomFunction, SUPER_NAMESPACE } from '../types/function';
import { CustomList } from '../types/list';
import { CustomMap } from '../types/map';
import { CustomNil } from '../types/nil';
import { CustomString } from '../types/string';
import { CustomValueWithIntrinsics } from '../types/with-intrinsics';
import { getSuper } from '../utils/get-super';
import { Path } from '../utils/path';
import { CPSVisit, Operation } from './operation';

export class SliceSegment {
  readonly left: Operation;
  readonly right: Operation;

  constructor(left: Operation, right: Operation) {
    this.left = left;
    this.right = right;
  }
}

export class PathSegment {
  async toPath(_ctx: OperationContext): Promise<CustomValue> {
    return Promise.resolve(DefaultType.Void);
  }
}

export class IdentifierSegment extends PathSegment {
  readonly value: string;

  constructor(value: string) {
    super();
    this.value = value;
  }

  toPath(_ctx: OperationContext): Promise<CustomValue> {
    return Promise.resolve(new CustomString(this.value));
  }
}

export class IndexSegment extends PathSegment {
  readonly op: Operation;

  constructor(op: Operation) {
    super();
    this.op = op;
  }

  async toPath(ctx: OperationContext): Promise<CustomValue> {
    return this.op.handle(ctx);
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

export class SegmentContainer {
  path: Array<Segment>;

  constructor() {
    this.path = [];
  }

  push(item: Segment): SegmentContainer {
    this.path.push(item);
    return this;
  }

  count(): number {
    return this.path.length;
  }

  at(index: number): Segment {
    return this.path[index];
  }

  isSuper(): boolean {
    return (
      this.path.length === 2 &&
      this.path[0] instanceof IdentifierSegment &&
      this.path[0].value === SUPER_NAMESPACE
    );
  }

  getLast(): Segment {
    return this.path[this.path.length - 1];
  }
}

export class ResolveNil extends CustomNil {}

export class ResolveResult {
  readonly path: Path<CustomValue>;
  readonly handle: CustomValue;

  constructor(path: Path<CustomValue>, handle: CustomValue) {
    this.path = path;
    this.handle = handle;
  }
}

export class Resolve extends Operation {
  readonly item: ASTBase;
  path: SegmentContainer;
  last: Segment;

  constructor(item: ASTBase, target?: string) {
    super(null, target);
    this.item = item;
  }

  async buildProcessor(node: ASTBase, visit: CPSVisit): Promise<void> {
    switch (node.type) {
      case ASTType.MemberExpression: {
        const memberExpr = node as ASTMemberExpression;
        if (memberExpr.base != null)
          await this.buildProcessor(memberExpr.base, visit);
        await this.buildProcessor(memberExpr.identifier, visit);
        break;
      }
      case ASTType.IndexExpression: {
        const indexExpr = node as ASTIndexExpression;
        if (indexExpr.base != null)
          await this.buildProcessor(indexExpr.base, visit);
        const indexSegment = new IndexSegment(await visit(indexExpr.index));
        this.path.push(indexSegment);
        break;
      }
      case ASTType.SliceExpression: {
        const sliceExpr = node as ASTSliceExpression;
        if (sliceExpr.base != null)
          await this.buildProcessor(sliceExpr.base, visit);
        const left = await visit(sliceExpr.left);
        const right = await visit(sliceExpr.right);
        const sliceSegment = new SliceSegment(left, right);
        this.path.push(sliceSegment);
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
    this.path = new SegmentContainer();
    await this.buildProcessor(this.item, visit);
    this.last = this.path.getLast();
    return this;
  }

  async getResult(
    ctx: OperationContext,
    handle: CustomValue = new ResolveNil()
  ): Promise<ResolveResult | null> {
    let traversedPath = new Path<CustomValue>();
    let index = 0;
    const exitObserver = ctx.processState.createExitObserver();
    const maxIndex = this.path.count();
    const lastIndex = maxIndex - 1;

    for (; index < maxIndex; index++) {
      if (exitObserver.occured()) {
        exitObserver.close();
        return new ResolveResult(null, new ResolveNil());
      }

      const current = this.path.at(index);

      if (current instanceof OperationSegment) {
        const opSegment = current as OperationSegment;
        handle = await opSegment.op.handle(ctx);
      } else if (current instanceof PathSegment) {
        traversedPath.add(await current.toPath(ctx));

        if (index === lastIndex) {
          break;
        }

        const previous = handle;

        if (!(handle instanceof ResolveNil)) {
          if (handle instanceof CustomValueWithIntrinsics) {
            const customValueCtx = handle as CustomValueWithIntrinsics;
            handle = customValueCtx.get(traversedPath);
          } else {
            throw new Error(`Unknown path ${traversedPath.toString()}.`);
          }
        } else {
          handle = ctx.get(traversedPath);
        }

        if (handle instanceof CustomFunction) {
          if (
            index === 1 &&
            traversedPath.toString() === SUPER_NAMESPACE &&
            ctx.functionState.context &&
            previous instanceof CustomMap
          ) {
            handle.setNextContext(previous.getIsa());
            handle = await handle.run(ctx.functionState.context, [], ctx);
          } else {
            handle = await handle.run(previous || DefaultType.Void, [], ctx);
          }
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

    exitObserver.close();

    return new ResolveResult(traversedPath, handle);
  }

  async handle(
    ctx: OperationContext,
    result: ResolveResult = null,
    autoCall: boolean = true
  ): Promise<CustomValue> {
    if (result === null) {
      const exitObserver = ctx.processState.createExitObserver();

      result = await this.getResult(ctx);

      exitObserver.close();

      if (exitObserver.occured()) {
        return DefaultType.Void;
      }
    }

    if (!(result.handle instanceof ResolveNil)) {
      if (result.path.count() === 0) {
        if (autoCall && result.handle instanceof CustomFunction) {
          return result.handle.run(DefaultType.Void, [], ctx);
        }

        return result.handle;
      }

      if (result.handle instanceof CustomValueWithIntrinsics) {
        const customValueCtx = result.handle;
        const { value: child, origin } = customValueCtx.getWithOrigin(
          result.path
        );
        const next = getSuper(origin);

        if (child instanceof CustomFunction) {
          child.setNextContext(next);
        }

        if (this.path.isSuper() && customValueCtx instanceof CustomMap) {
          if (autoCall && child instanceof CustomFunction) {
            if (ctx.functionState.context) {
              return child.run(ctx.functionState.context, [], ctx);
            }

            return child.run(customValueCtx, [], ctx);
          }

          return child;
        }

        if (autoCall && child instanceof CustomFunction) {
          return child.run(customValueCtx, [], ctx);
        }

        return child;
      }

      throw new Error(`Unknown path ${result.path.toString()}.`);
    }

    const handle = ctx.get(result.path);

    if (autoCall && handle instanceof CustomFunction) {
      return handle.run(DefaultType.Void, [], ctx);
    }

    return handle;
  }
}
