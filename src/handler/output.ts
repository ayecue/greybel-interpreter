import { OperationContext } from '../context';

export interface KeyEvent {
  keyCode: number;
  code: string;
}

export interface PrintOptions {
  appendNewLine: boolean;
  replace: boolean;
}

export abstract class OutputHandler {
  abstract print(
    ctx: OperationContext,
    message: string,
    options?: Partial<PrintOptions>
  ): void;

  abstract progress(ctx: OperationContext, timeout: number): PromiseLike<void>;
  abstract waitForInput(
    ctx: OperationContext,
    isPassword: boolean,
    message?: string
  ): PromiseLike<string>;

  abstract waitForKeyPress(
    ctx: OperationContext,
    message?: string
  ): PromiseLike<KeyEvent>;

  abstract clear(ctx: OperationContext): void;
}

export class DefaultOutputHandler extends OutputHandler {
  print(
    _ctx: OperationContext,
    message: string,
    { appendNewLine = true }: Partial<PrintOptions> = {}
  ) {
    if (appendNewLine) {
      process.stdout.write(message + '\n');
    } else {
      process.stdout.write(message);
    }
  }

  progress(_ctx: OperationContext, timeout: number): PromiseLike<void> {
    return new Promise((resolve, _reject) => {
      setTimeout(resolve, timeout);
    });
  }

  waitForInput(
    _ctx: OperationContext,
    _isPassword: boolean,
    _message?: string
  ): PromiseLike<string> {
    return Promise.resolve('test');
  }

  waitForKeyPress(
    _ctx: OperationContext,
    _message?: string
  ): PromiseLike<KeyEvent> {
    return Promise.resolve({
      keyCode: 13,
      code: 'Enter'
    });
  }

  clear(_ctx: OperationContext) {
    console.clear();
  }
}
