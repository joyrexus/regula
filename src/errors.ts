import { z } from "zod";

/**
 * Base error class for Regula validation errors
 */
export class ValidationError extends Error {
  details: string;

  /**
   * Creates a validation error
   * @param message Error message
   * @param details Optional detailed error information
   */
  constructor(message: string, details?: string) {
    super(message);
    this.name = "ValidationError";
    this.details = details || "";

    // Maintain proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ValidationError);
    }
  }

  /**
   * Create a validation error from a Zod error
   * @param message Base error message
   * @param zodError The Zod error to format
   * @returns A new ValidationError with formatted details
   */
  static fromZodError(message: string, zodError: z.ZodError): ValidationError {
    const details = zodError.errors
      .map((err) => `- Error at '${err.path.join(".")}': ${err.message}`)
      .join("\n");

    return new ValidationError(message, details);
  }

  /**
   * Returns a string representation of the error
   */
  toString(): string {
    return this.details ? `${this.message}\n${this.details}` : this.message;
  }
}

/**
 * Error class for rule evaluation errors
 */
export class EvaluationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EvaluationError";

    // Maintain proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, EvaluationError);
    }
  }
}
