export class UserError extends Error {
	constructor(message) {
		super(message);
		this.name = 'UserError';
		this.isUserError = true;
		Error.captureStackTrace(this, this.constructor);
	}
}

export class SystemError extends Error {
	constructor(message) {
		super(message);
		this.name = 'SystemError';
		this.isUserError = false;
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
		super(message);
		this.name = 'ExternalServiceError';
		this.serviceName = serviceName;
	}
}

export class NetworkError extends SystemError {
	constructor(message) {
		super(message);
		this.name = 'NetworkError';
	}
}

export class DatabaseError extends SystemError {
	constructor(message) {
		super(message);
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
