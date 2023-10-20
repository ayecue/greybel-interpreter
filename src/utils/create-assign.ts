import {
  ASTAssignmentStatement,
  ASTBase,
  ASTIdentifier
} from 'greyscript-core';

import { Assign } from '../operations/assign';
import { AssignGlobals } from '../operations/assign-globals';
import { AssignLocals } from '../operations/assign-locals';
import { AssignOuter } from '../operations/assign-outer';
import { AssignSelf } from '../operations/assign-self';
import { Operation } from '../operations/operation';

const hasOwnProperty = Object.prototype.hasOwnProperty;

const optAssignMap: Record<
  string,
  new (item: ASTBase, target?: string) => Operation
> = {
  self: AssignSelf,
  globals: AssignGlobals,
  locals: AssignLocals,
  outer: AssignOuter
};

export function createAssign(
  item: ASTAssignmentStatement,
  target?: string
): Operation {
  if (
    item.variable instanceof ASTIdentifier &&
    hasOwnProperty.call(optAssignMap, item.variable.name)
  ) {
    const OptAssign = optAssignMap[item.variable.name];
    return new OptAssign(item, target);
  }
  return new Assign(item, target);
}
