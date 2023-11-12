import {
  ASTIndexExpression,
  ASTMemberExpression,
  ASTSliceExpression
} from 'miniscript-core';

export type PathItem =
  | ASTMemberExpression
  | ASTIndexExpression
  | ASTSliceExpression;

export function lookupPath(item: PathItem): PathItem[] {
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
