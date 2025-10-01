import express from 'express';
import { validateToken } from "../services/token.service.js";
import { ValidationError, UnauthorizedError, logError } from "../core/errors.js";

const router = express.Router();

router.post('/logout', async (req, res, next) => {
	try {
		res.clearCookie('token');
		res.json(utils.makeResponse(true));
	} catch (error) {
		await logError(error, req, logger);
		res.json(utils.makeResponse(false));
	}
});

router.post('/login', async (req, res, next) => {
	if (!req.body || !req.body.token) {
		throw new ValidationError("Token 不能为空");
	}
	const tokenText = req.body.token;
	try {
		const token = await validateToken(tokenText);
		if (!token) {
			throw new UnauthorizedError("Token 无效");
		}
		res.cookie('token', tokenText, { httpOnly: true, maxAge: 30 * 24 * 60 * 60 * 1000 });
		res.json(utils.makeResponse(true));
	} catch (error) {
		await logError(error, req, logger);
		res.json(utils.makeResponse(false, { message: error.message }));
	}
});

router.get('/:id',  (req, res) => {
	const { id } = req.params;
	res.redirect(`https://www.luogu.com.cn/user/${id}`);
});

export default router;