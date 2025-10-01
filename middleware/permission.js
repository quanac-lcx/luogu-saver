import { UnauthorizedError, ForbiddenError } from "../core/errors.js";

export function requireLogin(req, res, next) {
	if (req.user) {
		next();
	} else {
		next(new UnauthorizedError("需要登录"));
	}
}

export function requireAdmin(req, res, next) {
	if (req.user && req.user.role === 1) {
		next();
	} else {
		next(new ForbiddenError("需要管理员权限"));
	}
}