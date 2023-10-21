import {
  ASTBase,
  ASTIdentifier,
  ASTIndexExpression,
  ASTMemberExpression,
  ASTSliceExpression
} from 'greyscript-core';

import { Operation } from '../operations/operation';
import { ReferenceGlobals } from '../operations/reference-globals';
import { ReferenceLocals } from '../operations/reference-locals';
import { ReferenceOuter } from '../operations/reference-outer';
import { ReferenceSelf } from '../operations/reference-self';
import { Resolve } from '../operations/resolve';
import { ResolveGlobals } from '../operations/resolve-globals';
import { ResolveLocals } from '../operations/resolve-locals';
import { ResolveOuter } from '../operations/resolve-outer';
import { ResolveSelf } from '../operations/resolve-self';
import { PathItem, lookupPath } from './lookup-path';

const hasOwnProperty = Object.prototype.hasOwnProperty;

const optIdentifierResolveMap: Record<
  string,
  new (item: ASTBase, target?: string) => Operation
> = {
  self: ReferenceSelf,
  globals: ReferenceGlobals,
  locals: ReferenceLocals,
  outer: ReferenceOuter
};

export function createIdentifierResolve(
  item: ASTIdentifier,
  target?: string
): Operation {
  if (hasOwnProperty.call(optIdentifierResolveMap, item.name)) {
    const OptResolve = optIdentifierResolveMap[item.name];
    return new OptResolve(item, target);
  }
  return new Resolve(item, target);
}

const optResolveMap: Record<
  string,
  new (item: ASTBase, target?: string) => Resolve
> = {
  self: ResolveSelf,
  globals: ResolveGlobals,
  locals: ResolveLocals,
  outer: ResolveOuter
};

export function createResolve(item: ASTBase, target?: string): Resolve {
  if (
    item instanceof ASTMemberExpression ||
    item instanceof ASTIndexExpression ||
    item instanceof ASTSliceExpression
  ) {
    const path = lookupPath(item);
    if (
      path.length > 0 &&
      path[0].base instanceof ASTIdentifier &&
      hasOwnProperty.call(optResolveMap, path[0].base.name)
    ) {
      const OptResolve = optResolveMap[path[0].base.name];
      path[0].base = null;
      return new OptResolve(item, target);
    }
  }
  return new Resolve(item, target);
}
