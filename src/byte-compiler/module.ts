import { ASTBase } from 'miniscript-core';

import { Stack } from '../utils/stack';
import { Instruction, SourceLocation } from './instruction';

export interface BytecodeGeneratorContext {
  code: Instruction[];
  jumpPoints: [Instruction, Instruction][];
}

export class Module {
  private _target: string;
  private _context: Stack<BytecodeGeneratorContext>;

  constructor(target: string) {
    this._target = target;
    this._context = new Stack({
      code: [],
      jumpPoints: []
    });
  }

  get target() {
    return this._target;
  }

  get context() {
    return this._context;
  }

  isGlobalScope() {
    return this._context.length === 1;
  }

  pushContext() {
    this._context.push({
      code: [],
      jumpPoints: []
    });
  }

  popContext() {
    return this._context.pop();
  }

  getCurrentIp() {
    return this._context.peek().code.length - 1;
  }

  getCode() {
    return this._context.peek().code;
  }

  pushCode(item: Instruction) {
    item.ip = this.getCurrentIp() + 1;
    this._context.peek().code.push(item);
  }

  getJumpPoint() {
    const jumpPoints = this._context.peek().jumpPoints;
    if (jumpPoints.length === 0) {
      return null;
    }
    return jumpPoints[jumpPoints.length - 1];
  }

  pushJumppoint(start: Instruction, end: Instruction) {
    this._context.peek().jumpPoints.push([start, end]);
  }

  popJumppoint() {
    return this._context.peek().jumpPoints.pop();
  }

  getSourceLocation(node: ASTBase, name?: string): SourceLocation {
    const target = this.target;
    return {
      name: name ?? node.type,
      path: target,
      start: node.start,
      end: node.end
    };
  }

  getInternalLocation(): SourceLocation {
    return {
      name: 'internal',
      path: 'internal',
      start: { line: 0, character: 0 },
      end: { line: 0, character: 0 }
    };
  }
}
