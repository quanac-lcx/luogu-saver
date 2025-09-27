export function requireLogin(req, res, next) {
	if (req.user) {
		next();
	} else {
		next(new Error("需要登录"));
	}
}

export function requireAdmin(req, res, next) {
	if (req.user && req.user.role === 1) {
		next();
	} else {
		next(new Error("需要管理员权限"));
	}
}