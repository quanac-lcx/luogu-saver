import express from 'express';
import db from "../db.js";
import {makeStandardResponse} from "../utils.js";
import logger from "../logger.js";

const router = express.Router();

router.post('/logout', async (req, res, next) => {
	try {
		res.clearCookie('token');
		res.json(makeStandardResponse(true));
	} catch (error) {
		res.json(makeStandardResponse(false));
	}
});

router.post('/login', async (req, res, next) => {
	const {token} = req.body;
	try {
		const [rows] = await db.query('SELECT * FROM token WHERE id = ?', [token]);
		if (rows.length === 0) {
			throw new Error('Invalid token.');
		}
		res.cookie('token', token, {httpOnly: true, maxAge: 30 * 24 * 60 * 60 * 1000});
		res.json(makeStandardResponse(true));
	} catch (error) {
		res.json(makeStandardResponse(false, {message: error.message}));
	}
});

router.get('/:id',  (req, res) => {
	const {id} = req.params;
	res.redirect(`https://www.luogu.com.cn/user/${id}`);
});

export default router;