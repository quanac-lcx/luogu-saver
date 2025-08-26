import db from "../db.js";
import logger from "../logger.js";

const auth = async (req, res, next) => {
	const token = req.cookies.token;
	if (!token) {
		req.user = null;
		return next();
	}
	const [rows] = await db.query('SELECT * FROM token WHERE id = ?', [token]);
	if (rows.length === 0) {
		req.user = null;
		return next();
	}
	req.user = {
		id: rows[0].uid,
		role: rows[0].role
	};
	next();
};

export default auth;