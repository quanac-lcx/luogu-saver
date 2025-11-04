import { makeResponse } from "../core/utils.js";

export default (err, req, res, next) => {
	// Check if this is an API/JSON request
	const isJsonRequest = req.path.startsWith('/api/') ||
	                      req.xhr || 
	                      req.headers.accept?.includes('application/json');
	
	if (isJsonRequest) {
		// Return JSON error response
		return res.json(makeResponse(false, { message: err.message }));
	}
	
	// Return HTML error page for regular requests
	res.render('system/error.njk', { title: "错误", error_message: err.message });
}