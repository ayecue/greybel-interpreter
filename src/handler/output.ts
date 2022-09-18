export abstract class OutputHandler {
  abstract print(message: string): void;
  abstract progress(timeout: number): Promise<void>;
  abstract waitForInput(): Promise<string>;
  abstract waitForKeyPress(): Promise<number>;
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

  waitForInput(): Promise<string> {
    return Promise.resolve('test');
  }

  waitForKeyPress(): Promise<number> {
    return Promise.resolve(13);
  }
}
