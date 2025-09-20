export default (req, res, next) => {
	res.status(404).render('404.njk', {
		title: "404",
		originalUrl: req.originalUrl
	});
}