import ErrorLog from "../models/error_log.js";

export default async (err, req, res, next) => {
	// Determine if this is a user error (common user mistakes) or system error
	const isUserError = isKnownUserError(err);
	
	if (isUserError) {
		// For user errors, only log at debug level to reduce console noise
		logger.debug(`User error while processing ${req.method} ${req.originalUrl}: ${err.message}`);
	} else {
		// For system errors, log at warn level
		logger.warn(`System error while processing ${req.method} ${req.originalUrl}: ${err.message}`);
	}
	
	// Always log to database for admin review
	try {
		await ErrorLog.logError(
			err.message,
			err.stack,
			req,
			isUserError ? 'warn' : 'error'
		);
	} catch (logError) {
		// If we can't log the error, at least log this to console
		logger.error(`Failed to log error to database: ${logError.message}`);
	}
	
	res.render('error.njk', { title: "错误", error_message: err.message });
}

// Helper function to identify common user errors
function isKnownUserError(err) {
	const userErrorMessages = [
		'需要登录',
		'需要管理员权限',
		'没有找到',
		'不存在',
		'已删除',
		'权限不足',
		'参数错误',
		'格式错误',
		'Token 无效',
		'验证失败'
	];
	
	return userErrorMessages.some(msg => err.message.includes(msg));
}