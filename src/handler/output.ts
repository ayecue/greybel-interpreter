export interface KeyEvent {
  keyCode: number;
  code: string;
}

export abstract class OutputHandler {
  abstract print(message: string, appendNewLine?: boolean): void;
  abstract progress(timeout: number): PromiseLike<void>;
  abstract waitForInput(
    isPassword: boolean,
    message?: string
  ): PromiseLike<string>;

  abstract waitForKeyPress(message?: string): PromiseLike<KeyEvent>;
  abstract clear(): void;
}

export class DefaultOutputHandler extends OutputHandler {
  print(message: string, appendNewLine: boolean = true) {
    if (appendNewLine) {
      process.stdout.write(message + '\n');
    } else {
      process.stdout.write(message);
    }
  }

  progress(timeout: number): PromiseLike<void> {
    return new Promise((resolve, _reject) => {
      setTimeout(resolve, timeout);
    });
  }

  waitForInput(_isPassword: boolean, _message?: string): PromiseLike<string> {
    return Promise.resolve('test');
  }

  waitForKeyPress(_message?: string): PromiseLike<KeyEvent> {
    return Promise.resolve({
      keyCode: 13,
      code: 'Enter'
    });
  }

  clear() {
    console.clear();
  }
}
