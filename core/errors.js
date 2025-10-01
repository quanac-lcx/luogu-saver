/**
 * Custom Error Classes for Proper Error Classification
 * 
 * This module defines custom error types to accurately distinguish between
 * user errors (client mistakes, invalid input) and system errors (server issues,
 * external service failures). This enables proper error logging and handling.
 * 
 * Error Categories:
 * - UserError: Errors caused by invalid user input or actions
 * - SystemError: Errors caused by system failures or external services
 * 
 * @author Copilot
 */

/**
 * Base class for user-related errors
 * These are errors caused by invalid user input or user actions
 * Examples: invalid ID, missing parameters, unauthorized access, not found
 */
export class UserError extends Error {
	constructor(message) {
		super(message);
		this.name = 'UserError';
		this.isUserError = true;
		Error.captureStackTrace(this, this.constructor);
	}
}

/**
 * Base class for system-related errors
 * These are errors caused by system failures, external services, or unexpected conditions
 * Examples: database failures, cache failures, external API failures
 */
export class SystemError extends Error {
	constructor(message) {
		super(message);
		this.name = 'SystemError';
		this.isUserError = false;
		Error.captureStackTrace(this, this.constructor);
	}
}

/**
 * Error for invalid input validation
 */
export class ValidationError extends UserError {
	constructor(message) {
		super(message);
		this.name = 'ValidationError';
	}
}

/**
 * Error for resource not found
 */
export class NotFoundError extends UserError {
	constructor(message) {
		super(message);
		this.name = 'NotFoundError';
	}
}

/**
 * Error for unauthorized access
 */
export class UnauthorizedError extends UserError {
	constructor(message) {
		super(message);
		this.name = 'UnauthorizedError';
	}
}

/**
 * Error for forbidden access (authenticated but not allowed)
 */
export class ForbiddenError extends UserError {
	constructor(message) {
		super(message);
		this.name = 'ForbiddenError';
	}
}

/**
 * Error for external service failures (API calls, etc)
 */
export class ExternalServiceError extends SystemError {
	constructor(message, serviceName = 'external service') {
		super(message);
		this.name = 'ExternalServiceError';
		this.serviceName = serviceName;
	}
}

/**
 * Error for database operation failures
 */
export class DatabaseError extends SystemError {
	constructor(message) {
		super(message);
		this.name = 'DatabaseError';
	}
}

/**
 * Helper function to determine if an error is a user error
 * @param {Error} error - The error to check
 * @returns {boolean} - True if user error, false if system error
 */
export function isUserError(error) {
	// Check if error has explicit isUserError property
	if (error.isUserError !== undefined) {
		return error.isUserError;
	}
	
	// Check if error is instance of UserError
	if (error instanceof UserError) {
		return true;
	}
	
	// Default to system error for safety
	return false;
}
