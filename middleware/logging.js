export default (req, res, next) => {
	logger.info(`${req.realIP} ${req.user?.id ? `(uid: ${req.user.id}) ` : ''}${req.method} ${req.originalUrl} ${(!req.body || JSON.stringify(req.body) === '{}') ? '' : JSON.stringify(req.body)}`);
	next();
}