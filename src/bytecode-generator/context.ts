import { ASTBase } from 'miniscript-core';

import { HandlerContainer } from '../handler-container';
import { Stack } from '../utils/stack';
import { Instruction, SourceLocation } from './instruction';
import { Module } from './module';

export interface ContextOptions {
  target: string;
  handler: HandlerContainer;
  debugMode?: boolean;
}

export type ContextInstruction = Partial<Instruction> &
  Required<Pick<Instruction, 'op'>> & {
    goto?: ContextInstruction;
  };

export class Context {
  protected _target: Stack<string>;
  protected _handler: HandlerContainer;
  protected _module: Stack<Module>;
  protected _debugMode: boolean;
  protected _imports: Map<string, Instruction[]>;

  constructor(options: ContextOptions) {
    this._target = new Stack(options.target);
    this._module = new Stack(new Module(options.target));
    this._handler = options.handler;
    this._imports = new Map();
    this._debugMode = options.debugMode ?? false;
  }

  get target() {
    return this._target;
  }

  get module() {
    return this._module;
  }

  get handler() {
    return this._handler;
  }

  get imports() {
    return this._imports;
  }

  isDebugMode() {
    return this._debugMode;
  }

  pushCode(intstruction: ContextInstruction, node: ASTBase, name?: string) {
    intstruction.source = this.getSourceLocation(node, name);
    this.module.peek().pushCode(intstruction as Instruction);
  }

  pushInternalCode(intstruction: ContextInstruction) {
    intstruction.source = this.getInternalLocation();
    this.module.peek().pushCode(intstruction as Instruction);
  }

  getSourceLocation(node: ASTBase, name?: string): SourceLocation {
    const target = this.target.peek();
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
