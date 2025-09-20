import express from 'express';
import { validateToken } from "../services/token.service.js";

const router = express.Router();

router.post('/logout', async (req, res, next) => {
	try {
		res.clearCookie('token');
		res.json(utils.makeResponse(true));
	} catch (error) {
		res.json(utils.makeResponse(false));
	}
});

router.post('/login', async (req, res, next) => {
	if (!req.body || !req.body.token) {
		throw new Error('Token is required.');
	}
	const tokenText = req.body.token;
	try {
		const token = await validateToken(tokenText);
		if (!token) {
			throw new Error('Invalid token.');
		}
		res.cookie('token', tokenText, { httpOnly: true, maxAge: 30 * 24 * 60 * 60 * 1000 });
		res.json(utils.makeResponse(true));
	} catch (error) {
		res.json(utils.makeResponse(false, { message: error.message }));
	}
});

router.get('/:id',  (req, res) => {
	const { id } = req.params;
	res.redirect(`https://www.luogu.com.cn/user/${id}`);
});

export default router;