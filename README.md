# greybel-interpreter

[![greybel-interpreter](https://circleci.com/gh/ayecue/greybel-interpreter.svg?style=svg)](https://circleci.com/gh/ayecue/greybel-interpreter)

A bytecode interpreter for [MiniScript](https://miniscript.org) written in TypeScript. It compiles MiniScript source code to bytecode and executes it in a stack-based VM built on top of [greybel-core](../greybel-core). For GreyScript-specific interpretation, see [greyscript-interpreter](../greyscript-interpreter).

## Features

* Bytecode compiler that converts AST to efficient instructions
* Stack-based virtual machine with non-blocking scheduling
* Built-in type system: string, number, boolean, list, map, function, and nil
* Pluggable handler system for resource loading, output, and error handling
* Debugger support with breakpoints and step-through execution
* Code injection at runtime via `interpreter.inject()`
* Environment variable injection
* Extensible API surface - supply custom intrinsics via an `ObjectValue` map
* Runs in both Node.js and the browser (includes Rollup bundle config)
* Written in TypeScript with type definitions included

## Install

```
npm install greybel-interpreter
```

## Usage

```ts
import { Interpreter, HandlerContainer } from 'greybel-interpreter';

const interpreter = new Interpreter({
  target: '/path/to/main.src',
  handler: new HandlerContainer(),
  environmentVariables: new Map([['MY_VAR', '123']])
});

await interpreter.run();
```

### Custom intrinsics

```ts
import {
  Interpreter,
  CustomFunction,
  CustomString,
  DefaultType,
  ObjectValue
} from 'greybel-interpreter';

const api = new ObjectValue();

api.set(
  new CustomString('exit'),
  CustomFunction.createExternal('exit', (fnCtx, self, args) => {
    interpreter.exit();
    return Promise.resolve(DefaultType.Void);
  })
);

const interpreter = new Interpreter({
  target: '/path/to/main.src',
  api
});

await interpreter.run();
```

## Testing

```
npm test
```