export default (err, req, res, next) => {
	logger.warn(`An error occurred while processing ${req.method} ${req.originalUrl}: ${err.message}`);
	res.render('error.njk', { title: "错误", error_message: err.message });
}