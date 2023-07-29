import { DefaultErrorHandler, ErrorHandler } from './handler/error';
import { DefaultOutputHandler, OutputHandler } from './handler/output';
import { DefaultResourceHandler, ResourceHandler } from './handler/resource';

export interface HandlerContainerOptions {
  resourceHandler?: ResourceHandler;
  outputHandler?: OutputHandler;
  errorHandler?: ErrorHandler;
}

export class HandlerContainer {
  readonly resourceHandler: ResourceHandler;
  readonly outputHandler: OutputHandler;
  readonly errorHandler: ErrorHandler;

  constructor(options: HandlerContainerOptions = {}) {
    this.resourceHandler =
      options?.resourceHandler ?? new DefaultResourceHandler();
    this.outputHandler = options?.outputHandler ?? new DefaultOutputHandler();
    this.errorHandler = options?.errorHandler ?? new DefaultErrorHandler();
  }
}
