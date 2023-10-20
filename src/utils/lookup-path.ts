import {
  ASTBase,
  ASTIndexExpression,
  ASTMemberExpression,
  ASTSliceExpression
} from 'greyscript-core';

export type PathItem = ASTBase & { base: ASTBase };

export function lookupPath(item: ASTMemberExpression): PathItem[] {
  const path: PathItem[] = [item];
  let current = item.base;

  while (
    current instanceof ASTMemberExpression ||
    current instanceof ASTIndexExpression ||
    current instanceof ASTSliceExpression
  ) {
    path.unshift(current);
    current = current.base;
  }

  return path;
}
