import { Stack } from '../utils/stack';
import { ContextInstruction } from './context';
import { Instruction } from './instruction';

export interface BytecodeGeneratorContext {
  code: Instruction[];
  jumpPoints: [ContextInstruction, ContextInstruction][];
}

export class Module {
  protected _target: string;
  protected _context: Stack<BytecodeGeneratorContext>;

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

  pushJumppoint(start: ContextInstruction, end: ContextInstruction) {
    this._context.peek().jumpPoints.push([start, end]);
  }

  popJumppoint() {
    return this._context.peek().jumpPoints.pop();
  }
}
