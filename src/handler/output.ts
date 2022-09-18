export abstract class OutputHandler {
  abstract print(message: string): void;
  abstract progress(timeout: number): Promise<void>;
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
}
