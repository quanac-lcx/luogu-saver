import Token from "../models/token.js";

export default async (req, res, next) => {
	const tokenText = req.cookies.token;
	if (!tokenText) {
		req.user = null;
		return next();
	}
	const token = await Token.findById(tokenText);
	if (!token) {
		req.user = null;
		return next();
	}
	req.user = {
		id: token.uid,
		role: token.role
	};
	res.locals.user = req.user;
	next();
};