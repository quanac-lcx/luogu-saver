import express from 'express';
import { applyToken, refreshToken, verifyAccessKey } from '../services/paintboard.service.js';
import { logError } from "../core/errors.js";
import { makeResponse } from "../core/utils.js";
import { requireLogin } from "../middleware/permission.js";

const router = express.Router();

router.get('/', (req, res, next) => res.render('paintboard/view.njk', { title: '冬日绘板' }));
router.get('/webgl', (req, res, next) => res.render('paintboard/view_webgl.njk', { title: '冬日绘板' }));
router.get('/view', (req, res, next) => res.redirect('/paintboard'));
router.get('/view/webgl', (req, res, next) => res.redirect('/paintboard/webgl'));

router.get('/token', requireLogin, (req, res, next) => {
	res.render('paintboard/token.njk', { title: '申请凭据', user: req.user });
});

router.post('/apply', requireLogin, async (req, res, next) => {
	try {
		const uid = req.user.id;
		const result = await applyToken(uid);
		
		return res.json({
			success: true,
			token: result.token,
			message: result.isNew ? '凭据创建成功' : '返回已有凭据'
		});
	} catch (error) {
		await logError(error, req);
		return res.json(makeResponse(false, { message: error.message }));
	}
});

router.post('/refresh', requireLogin, async (req, res, next) => {
	try {
		const uid = req.user.id;
		const result = await refreshToken(uid);
		
		return res.json(makeResponse(true, {
			token: result.token,
			message: '凭据已刷新'
		}));
	} catch (error) {
		await logError(error, req);
		return res.json(makeResponse(false, { message: error.message }));
	}
});

router.get('/verify/:key', async (req, res, next) => {
	try {
		const key = req.params.key;
		const result = await verifyAccessKey(key);
		return res.json(makeResponse(true, {
			uid: result.uid,
			role: result.role
		}));
	} catch (error) {
		await logError(error, req);
		return res.json(makeResponse(false, { message: error.message }));
	}
});

export default router;