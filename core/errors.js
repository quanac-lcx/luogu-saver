export class UserError extends Error {
	constructor(message) {
		super(message);
		this.name = 'UserError';
		this.isUserError = true;
		Error.captureStackTrace(this, this.constructor);
	}
}

export class SystemError extends Error {
	constructor(message, severity = 'error') {
		super(message);
		this.name = 'SystemError';
		this.isUserError = false;
		this.severity = severity; // 'warn' or 'error'
		Error.captureStackTrace(this, this.constructor);
	}
}

export class ValidationError extends UserError {
	constructor(message) {
		super(message);
		this.name = 'ValidationError';
	}
}

export class NotFoundError extends UserError {
	constructor(message) {
		super(message);
		this.name = 'NotFoundError';
	}
}

export class UnauthorizedError extends UserError {
	constructor(message) {
		super(message);
		this.name = 'UnauthorizedError';
	}
}

export class ForbiddenError extends UserError {
	constructor(message) {
		super(message);
		this.name = 'ForbiddenError';
	}
}

export class ExternalServiceError extends SystemError {
	constructor(message, serviceName = 'external service') {
		super(message, 'warn'); // External service errors are warnings by default
		this.name = 'ExternalServiceError';
		this.serviceName = serviceName;
	}
}

export class NetworkError extends SystemError {
	constructor(message) {
		super(message, 'warn'); // Network errors are warnings by default
		this.name = 'NetworkError';
	}
}

export class DatabaseError extends SystemError {
	constructor(message) {
		super(message, 'error'); // Database errors are critical
		this.name = 'DatabaseError';
	}
}

export function isUserError(error) {
	if (error.isUserError !== undefined) {
		return error.isUserError;
	}
	
	if (error instanceof UserError) {
		return true;
	}
	
	return false;
}

/**
 * Get the error level for logging
 * @param {Error} error - The error object
 * @returns {string} - The error level: 'info' for user errors, 'warn' or 'error' for system errors
 */
export function getErrorLevel(error) {
	// User errors are logged as 'info' level
	if (isUserError(error)) {
		return 'info';
	}
	
	// System errors check severity property
	if (error.severity) {
		return error.severity; // 'warn' or 'error'
	}
	
	// Default to 'error' for unknown errors
	return 'error';
}

/**
 * Helper function to log errors to database and console
 * @param {Error} error - The error object
 * @param {Object} req - Express request object (optional)
 * @param {Object} logger - Logger instance
 * @returns {Promise<void>}
 */
export async function logError(error, req = null, logger = null) {
	const userError = isUserError(error);
	const level = getErrorLevel(error);
	
	// Log to console with appropriate level
	if (logger) {
		if (userError) {
			logger.info(`User error: ${error.message}`);
		} else if (level === 'warn') {
			logger.warn(`System warning: ${error.message}`);
		} else {
			logger.error(`System error: ${error.message}`);
		}
	}
	
	// Log to database
	try {
		// Dynamic import to avoid circular dependency
		const { default: ErrorLog } = await import('../models/error_log.js');
		await ErrorLog.logError(
			error.message,
			error.stack,
			req,
			level
		);
	} catch (logError) {
		if (logger) {
			logger.error(`Failed to log error to database: ${logError.message}`);
		}
	}
}

/**
 * Async handler wrapper that automatically catches and logs errors
 * @param {Function} fn - Async route handler function
 * @returns {Function} - Wrapped handler that catches errors and logs them
 */
export function asyncHandler(fn) {
	return (req, res, next) => {
		Promise.resolve(fn(req, res, next))
			.catch(async (error) => {
				// Log error to database and console
				await logError(error, req, logger);
				
				// For API endpoints that return JSON, send error response
				if (req.path.startsWith('/api/') || req.xhr || req.headers.accept?.includes('application/json')) {
					return res.json(utils.makeResponse(false, { message: error.message }));
				}
				
				// For page requests, pass to error display middleware
				next(error);
			});
	};
}
