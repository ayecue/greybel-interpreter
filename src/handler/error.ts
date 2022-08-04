export abstract class ErrorHandler {
  abstract raise(err: Error): void;
}

export class DefaultErrorHandler extends ErrorHandler {
  raise(err: Error) {
    throw err;
  }
}
