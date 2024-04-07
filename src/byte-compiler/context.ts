import { Parser } from 'greybel-core';

import { HandlerContainer } from '../handler-container';
import { PrepareError } from '../utils/error';
import { Stack } from '../utils/stack';
import { Instruction } from './instruction';
import { Module } from './module';

export interface ContextOptions {
  target: string;
  handler: HandlerContainer;
  debugMode?: boolean;
}

export class Context {
  private _target: Stack<string>;
  private _handler: HandlerContainer;
  private _module: Stack<Module>;
  private _debugMode: boolean;
  private _imports: Map<string, Instruction[]>;

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

  parse(code: string) {
    try {
      const parser = new Parser(code);
      return parser.parseChunk();
    } catch (err: any) {
      if (err instanceof PrepareError) {
        this.handler.errorHandler.raise(err);
      } else {
        this.handler.errorHandler.raise(
          new PrepareError(err.message, {
            range: err.range,
            target: this._target.peek()
          })
        );
      }
    }
  }
}
