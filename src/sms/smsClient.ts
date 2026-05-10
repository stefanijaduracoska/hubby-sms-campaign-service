export interface SmsClient {
  send(input: {
    iccid: string;
    body: string;
  }): Promise<{ providerMessageId: string }>;
}

export class TransientSmsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TransientSmsError";
  }
}

export class PermanentSmsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PermanentSmsError";
  }
}

export function isTransientSmsError(error: unknown): error is TransientSmsError {
  return error instanceof TransientSmsError;
}

export function isPermanentSmsError(error: unknown): error is PermanentSmsError {
  return error instanceof PermanentSmsError;
}