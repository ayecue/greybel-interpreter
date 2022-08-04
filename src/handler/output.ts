export abstract class OutputHandler {
  abstract print(message: string): void;
}

export class DefaultOutputHandler extends OutputHandler {
  print(message: string) {
    console.log(message);
  }
}
