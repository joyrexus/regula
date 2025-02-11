export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export class EvaluationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EvaluationError";
  }
}
