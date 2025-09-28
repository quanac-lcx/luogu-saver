export function requireLogin(req, res, next) {
	if (req.user) {
		next();
	} else {
		next(new Error("Login required"));
	}
}

export function requireAdmin(req, res, next) {
	if (req.user && req.user.role === 1) {
		next();
	} else {
		next(new Error("Administrator access required"));
	}
}