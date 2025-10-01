import ErrorLog from "../models/error_log.js";
import { isUserError } from "../core/errors.js";

export default async (err, req, res, next) => {
	const userError = isUserError(err);
	
	if (userError) {
		logger.warn(`User error: ${err.message}`);
	} else {
		logger.error(`System error: ${err.message}`);
	}
	
	try {
		await ErrorLog.logError(
			err.message,
			err.stack,
			req,
			userError ? 'warn' : 'error'
		);
	} catch (logError) {
		logger.error(`Failed to log error to database: ${logError.message}`);
	}
	
	res.render('system/error.njk', { title: "错误", error_message: err.message });
}