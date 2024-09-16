import { ASTPosition } from 'miniscript-core';

import { CustomValue } from '../types/base';
import { CustomFunctionCallback } from '../types/function';
import { CustomString } from '../types/string';

export enum OpCode {
  NOOP,
  HALT,
  CALL,
  CALL_INTERNAL,
  CALL_WITH_CONTEXT,
  CONSTRUCT_MAP,
  CONSTRUCT_LIST,
  GET_VARIABLE,
  GET_PROPERTY,
  GET_ENVAR,
  GET_SELF,
  GET_OUTER,
  GET_GLOBALS,
  GET_LOCALS,
  GET_SUPER,
  GET_SUPER_PROPERTY,
  CALL_SUPER_PROPERTY,
  FALSIFY,
  NEGATE,
  NEW,
  SLICE,
  ASSIGN,
  PUSH,
  POP,
  ISA,
  ADD,
  SUB,
  MUL,
  DIV,
  MOD,
  POW,
  EQUAL,
  NOT_EQUAL,
  LESS_THAN,
  LESS_THAN_OR_EQUAL,
  GREATER_THAN,
  GREATER_THAN_OR_EQUAL,
  COMPARISON_GROUP,
  AND,
  OR,
  RETURN,
  FUNCTION_DEFINITION,
  GOTO_A,
  GOTO_A_IF_FALSE,
  GOTO_A_IF_FALSE_AND_PUSH,
  GOTO_A_IF_TRUE,
  GOTO_A_IF_TRUE_AND_PUSH,
  PUSH_ITERATOR,
  POP_ITERATOR,
  NEXT,
  BITWISE_OR,
  BITWISE_AND,
  BITWISE_LEFT_SHIFT,
  BITWISE_RIGHT_SHIFT,
  BITWISE_UNSIGNED_RIGHT_SHIFT,
  BREAKPOINT,
  BREAKPOINT_ENABLE,
  IMPORT,
  EXPORT
}

export interface FunctionDefinitionInstructionArgument {
  name: CustomString;
  defaultValue: CustomValue;
}

export type SourceLocation = {
  name: string;
  path: string;
  start: ASTPosition;
  end: ASTPosition;
};

export interface BaseInstruction {
  op: OpCode;
  source: SourceLocation;
  ip?: number;
  command?: boolean;
}

export interface GetVariableInstruction extends BaseInstruction {
  op: OpCode.GET_VARIABLE;
  property: CustomString;
  invoke: boolean;
}

export interface GetPropertyInstruction extends BaseInstruction {
  op: OpCode.GET_PROPERTY | OpCode.GET_SUPER_PROPERTY;
  invoke: boolean;
}

export interface PushInstruction extends BaseInstruction {
  op: OpCode.PUSH;
  value: CustomValue;
}

export interface ConstructMapInstruction extends BaseInstruction {
  op: OpCode.CONSTRUCT_MAP;
  length: number;
}

export interface ConstructListInstruction extends BaseInstruction {
  op: OpCode.CONSTRUCT_LIST;
  length: number;
}

export interface CallInstruction extends BaseInstruction {
  op: OpCode.CALL | OpCode.CALL_WITH_CONTEXT | OpCode.CALL_SUPER_PROPERTY;
  length: number;
}

export interface FunctionDefinitionInstruction extends BaseInstruction {
  op: OpCode.FUNCTION_DEFINITION;
  arguments: FunctionDefinitionInstructionArgument[];
  /* eslint-disable no-use-before-define */
  code: Instruction[];
  ignoreOuter: boolean;
}

export interface GotoAInstruction extends BaseInstruction {
  op:
    | OpCode.GOTO_A
    | OpCode.GOTO_A_IF_FALSE
    | OpCode.GOTO_A_IF_FALSE_AND_PUSH
    | OpCode.GOTO_A_IF_TRUE
    | OpCode.GOTO_A_IF_TRUE_AND_PUSH;
  /* eslint-disable no-use-before-define */
  goto: Instruction;
}

export interface NextInstruction extends BaseInstruction {
  op: OpCode.NEXT;
  /* eslint-disable no-use-before-define */
  goto: Instruction;
  idxVariable: CustomString;
  variable: CustomString;
}

export interface CallInternalInstruction extends BaseInstruction {
  op: OpCode.CALL_INTERNAL;
  callback: CustomFunctionCallback;
  arguments: FunctionDefinitionInstructionArgument[];
}

export interface ImportInstruction extends BaseInstruction {
  op: OpCode.IMPORT | OpCode.EXPORT;
  path: string;
}

export interface ComparisonGroupInstruction extends BaseInstruction {
  op: OpCode.COMPARISON_GROUP;
  operators: string[];
}

export type Instruction =
  | BaseInstruction
  | GetVariableInstruction
  | PushInstruction
  | ConstructMapInstruction
  | ConstructListInstruction
  | FunctionDefinitionInstruction
  | GotoAInstruction
  | GetPropertyInstruction
  | CallInstruction
  | NextInstruction
  | CallInternalInstruction
  | ImportInstruction
  | ComparisonGroupInstruction;
