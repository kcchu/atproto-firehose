export class EventStreamError extends Error {
  constructor(error: string, message?: string) {
    super(message ? `${error}: ${message}` : error)
  }
}
