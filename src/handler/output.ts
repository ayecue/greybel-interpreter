import type { VM } from '../vm';

export interface KeyEvent {
  keyCode?: number;
  charCode?: number;
  code: string;
}

export interface PrintOptions {
  appendNewLine: boolean;
  replace: boolean;
}

export interface UpdateOptions {
  appendNewLine: boolean;
  replace: boolean;
}

export abstract class OutputHandler {
  abstract print(
    vm: VM,
    message: string,
    options?: Partial<PrintOptions>
  ): void;

  abstract update(
    vm: VM,
    message: string,
    options?: Partial<UpdateOptions>
  ): void;

  abstract progress(vm: VM, timeout: number): PromiseLike<void>;
  abstract waitForInput(
    vm: VM,
    isPassword: boolean,
    message?: string
  ): PromiseLike<string>;

  abstract waitForKeyPress(vm: VM, message?: string): PromiseLike<KeyEvent>;

  abstract clear(vm: VM): void;
}

export class DefaultOutputHandler extends OutputHandler {
  print(
    _vm: VM,
    message: string,
    { appendNewLine = true }: Partial<PrintOptions> = {}
  ) {
    if (appendNewLine) {
      process.stdout.write(message + '\n');
    } else {
      process.stdout.write(message);
    }
  }

  update(
    _vm: VM,
    message: string,
    { appendNewLine = false, replace = false }: Partial<UpdateOptions> = {}
  ) {
    if (replace) {
      process.stdout.write('\x1b[2K\r' + message + (appendNewLine ? '\n' : ''));
    } else {
      process.stdout.write(message + (appendNewLine ? '\n' : ''));
    }
  }

  progress(_vm: VM, timeout: number): PromiseLike<void> {
    return new Promise((resolve, _reject) => {
      setTimeout(resolve, timeout);
    });
  }

  waitForInput(
    _vm: VM,
    _isPassword: boolean,
    _message?: string
  ): PromiseLike<string> {
    return Promise.resolve('test');
  }

  waitForKeyPress(_vm: VM, _message?: string): PromiseLike<KeyEvent> {
    return Promise.resolve({
      keyCode: 13,
      code: 'Enter'
    });
  }

  clear(_vm: VM) {
    console.clear();
  }
}
