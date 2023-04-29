import { CancelablePromise } from 'cancelable-promise';

export interface KeyEvent {
  keyCode: number;
  code: string;
}

export abstract class OutputHandler {
  abstract print(message: string, appendNewLine: boolean): void;
  abstract progress(timeout: number): CancelablePromise<void>;
  abstract waitForInput(isPassword: boolean): CancelablePromise<string>;
  abstract waitForKeyPress(): CancelablePromise<KeyEvent>;
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

  progress(timeout: number): CancelablePromise<void> {
    return new CancelablePromise((resolve, _reject, onCancel) => {
      const timer = setTimeout(resolve, timeout);

      onCancel(() => {
        clearTimeout(timer);
        resolve();
      });
    });
  }

  waitForInput(_isPassword: boolean): CancelablePromise<string> {
    return CancelablePromise.resolve('test');
  }

  waitForKeyPress(): CancelablePromise<KeyEvent> {
    return CancelablePromise.resolve({
      keyCode: 13,
      code: 'Enter'
    });
  }

  clear() {
    console.clear();
  }
}
