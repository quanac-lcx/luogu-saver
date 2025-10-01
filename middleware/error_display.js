import { logError } from "../core/errors.js";

export default async (err, req, res, next) => {
	await logError(err, req, logger);
	res.render('system/error.njk', { title: "错误", error_message: err.message });
}