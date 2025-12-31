/**
 * Custom error classes for better error handling
 */

/**
 * Base application error
 */
export class AppError extends Error {
	constructor(
		message: string,
		public statusCode: number = 500,
		public code?: string
	) {
		super(message);
		this.name = "AppError";
		Object.setPrototypeOf(this, AppError.prototype);
	}
}

/**
 * Resource not found error
 */
export class NotFoundError extends AppError {
	constructor(resource: string, id?: string) {
		super(
			id ? `${resource} with ID ${id} not found` : `${resource} not found`,
			404,
			"NOT_FOUND"
		);
		this.name = "NotFoundError";
		Object.setPrototypeOf(this, NotFoundError.prototype);
	}
}

/**
 * Validation error
 */
export class ValidationError extends AppError {
	constructor(message: string, public fields?: Record<string, string>) {
		super(message, 400, "VALIDATION_ERROR");
		this.name = "ValidationError";
		Object.setPrototypeOf(this, ValidationError.prototype);
	}
}

/**
 * Provider error
 */
export class ProviderError extends AppError {
	constructor(provider: string, message: string) {
		super(`Provider ${provider}: ${message}`, 500, "PROVIDER_ERROR");
		this.name = "ProviderError";
		Object.setPrototypeOf(this, ProviderError.prototype);
	}
}

/**
 * Storage error
 */
export class StorageError extends AppError {
	constructor(operation: string, message: string) {
		super(`Storage ${operation}: ${message}`, 500, "STORAGE_ERROR");
		this.name = "StorageError";
		Object.setPrototypeOf(this, StorageError.prototype);
	}
}

/**
 * Check if error is an AppError
 */
export function isAppError(error: any): error is AppError {
	return error instanceof AppError;
}
