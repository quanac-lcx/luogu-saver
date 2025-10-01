import { UnauthorizedError, ForbiddenError } from "../core/errors.js";

export function requireLogin(req, res, next) {
	if (req.user) {
		next();
	} else {
		next(new UnauthorizedError("Login required"));
	}
}

export function requireAdmin(req, res, next) {
	if (req.user && req.user.role === 1) {
		next();
	} else {
		next(new ForbiddenError("Administrator access required"));
	}
}