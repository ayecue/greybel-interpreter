import { ASTBase, ASTIdentifier, ASTMemberExpression } from 'greyscript-core';

import { Resolve } from '../operations/resolve';
import { ResolveGlobals } from '../operations/resolve-globals';
import { ResolveLocals } from '../operations/resolve-locals';
import { ResolveOuter } from '../operations/resolve-outer';
import { ResolveSelf } from '../operations/resolve-self';
import { lookupPath } from './lookup-base';

export function createResolve(item: ASTBase, target?: string): Resolve {
  if (item instanceof ASTMemberExpression) {
    const memberExpr = item as ASTMemberExpression;
    const path = lookupPath(memberExpr);
    if (path[0].base instanceof ASTIdentifier) {
      switch (path[0].base.name) {
        case 'self':
          return new ResolveSelf(path[0].identifier, target);
        case 'globals':
          return new ResolveGlobals(path[0].identifier, target);
        case 'locals':
          return new ResolveLocals(path[0].identifier, target);
        case 'outer':
          return new ResolveOuter(path[0].identifier, target);
      }
    }
  }
  return new Resolve(item, target);
}
