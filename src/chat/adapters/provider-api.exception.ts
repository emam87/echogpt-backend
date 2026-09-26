export class ProviderApiException extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 502,
  ) {
    super(message);
    this.name = 'ProviderApiException';
  }
}
