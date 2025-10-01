import ErrorLog from "../models/error_log.js";

export default async (err, req, res, next) => {
	// Determine if this is a user error (common user mistakes) or system error
	const isUserError = isKnownUserError(err);
	
	if (isUserError) {
		logger.debug(`User error: ${err.message}`);
	} else {
		// For system errors, log at warn level
		logger.warn(err.message);
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
	
	res.render('system/error.njk', { title: "错误", error_message: err.message });
}

// Helper function to identify common user errors
function isKnownUserError(err) {
	const userErrorMessages = [
		'Missing required parameters',
		'Invalid input',
		'Invalid article ID',
		'Invalid paste ID',
		'not found',
		'is required',
		'Invalid token',
		'has been deleted',
		'Verification content does not match',
		'UID does not match',
		'Administrator access required',
		'Login required'
	];
	
	return userErrorMessages.some(msg => err.message.includes(msg));
}