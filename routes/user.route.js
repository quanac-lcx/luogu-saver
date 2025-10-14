import express from 'express';
import { validateToken } from "../services/token.service.js";
import { ValidationError, UnauthorizedError, asyncJsonHandler, asyncHandler } from "../core/errors.js";
import { makeResponse } from "../core/utils.js";
import { getUserProfileById } from "../services/user.service.js";

const router = express.Router();

router.post('/logout', asyncJsonHandler(async (req, res, next) => {
	res.clearCookie('token');
	res.json(makeResponse(true));
}));

router.post('/login', asyncJsonHandler(async (req, res, next) => {
	if (!req.body || !req.body.token) {
		throw new ValidationError("Token 不能为空");
	}
	const tokenText = req.body.token;
	const token = await validateToken(tokenText);
	if (!token) {
		throw new UnauthorizedError("Token 无效");
	}
	res.cookie('token', tokenText, { httpOnly: true, maxAge: 30 * 24 * 60 * 60 * 1000 });
	res.json(makeResponse(true));
}));

router.get('/save/:uid', asyncJsonHandler(async (req, res) => {
	const uid = parseInt(req.params.uid);
	if (!uid || isNaN(uid)) throw new ValidationError("用户 ID 无效");
	const url = `https://www.luogu.com/user/${uid}`;
	const id = await worker.pushTaskToQueue({ url, aid: uid, type: 4 });
	res.send(makeResponse(true, { message: "请求已入队", result: id }));
}));

router.get('/:uid', asyncHandler(async (req, res, next) => {
	const { uid } = req.params;
	const id = parseInt(uid);
	if (!id || isNaN(id)) throw new ValidationError("用户 ID 无效");
	
	const result = await getUserProfileById(id);
	
	if (!result) {
		res.render('content/user.njk', {
			title: "保存用户资料",
			user: { id: id, name: `用户 ${id}`, color: "Gray", updated_at: "尚未保存" },
			renderedContent: null,
			empty: true
		});
		return;
	}
	
	const { user, renderedContent } = result;
	res.render('content/user.njk', {
		title: `用户 ${user.name}`,
		user,
		renderedContent,
		empty: false
	});
}));

export default router;