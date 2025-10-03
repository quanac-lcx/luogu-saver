export default (err, req, res, next) => {
	res.render('system/error.njk', { title: "错误", error_message: err.message });
}