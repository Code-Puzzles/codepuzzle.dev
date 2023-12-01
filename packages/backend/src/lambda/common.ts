export class ClientError extends Error {
  constructor(
    message?: string,
    public statusCode?: number,
  ) {
    super(message);
  }
}
