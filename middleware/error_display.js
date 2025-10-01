import ErrorLog from "../models/error_log.js";
import { isUserError } from "../core/errors.js";

export default async (err, req, res, next) => {
	// Determine if this is a user error (common user mistakes) or system error
	// Uses error class type instead of message matching for accuracy
	const userError = isUserError(err);
	
	if (userError) {
		// User errors are logged at warn level (not critical)
		logger.warn(`User error: ${err.message}`);
	} else {
		// System errors are logged at error level (critical)
		logger.error(`System error: ${err.message}`);
	}
	
	// Always log to database for admin review
	try {
		await ErrorLog.logError(
			err.message,
			err.stack,
			req,
			userError ? 'warn' : 'error'
		);
	} catch (logError) {
		// If we can't log the error, at least log this to console
		logger.error(`Failed to log error to database: ${logError.message}`);
	}
	
	res.render('system/error.njk', { title: "错误", error_message: err.message });
}