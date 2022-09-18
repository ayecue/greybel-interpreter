export interface KeyEvent {
  keyCode: number;
  code: string;
}

export abstract class OutputHandler {
  abstract print(message: string): void;
  abstract progress(timeout: number): Promise<void>;
  abstract waitForInput(isPassword: boolean): Promise<string>;
  abstract waitForKeyPress(): Promise<KeyEvent>;
  abstract clear(): void;
}

export class DefaultOutputHandler extends OutputHandler {
  print(message: string) {
    console.log(message);
  }

  progress(timeout: number): Promise<void> {
    return new Promise((resolve, _reject) => {
      setTimeout(resolve, timeout);
    });
  }

  waitForInput(_isPassword: boolean): Promise<string> {
    return Promise.resolve('test');
  }

  waitForKeyPress(): Promise<KeyEvent> {
    return Promise.resolve({
      keyCode: 13,
      code: 'Enter'
    });
  }

  clear() {
    console.clear();
  }
}
