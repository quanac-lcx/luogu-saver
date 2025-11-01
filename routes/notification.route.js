// filepath: d:\WebstormProjects\luogu-saver\routes\notification.route.js
import express from 'express';
import { asyncHandler, asyncJsonHandler } from "../core/errors.js";
import { makeResponse } from "../core/utils.js";
import { requireLogin } from "../middleware/permission.js";
import * as notificationService from "../services/notification.service.js";

const router = express.Router();

router.get('/', requireLogin, asyncHandler(async (req, res) => {
	const page = parseInt(req.query.page) || 1;
	const result = await notificationService.getUserNotifications({ uid: req.user.id, page, limit: 20 });
	res.render('user/notifications.njk', {
		title: '我的通知',
		...result
	});
}));

router.get('/api', requireLogin, asyncJsonHandler(async (req, res) => {
	const page = parseInt(req.query.page) || 1;
	const unreadOnly = req.query.unread === '1';
	const result = await notificationService.getUserNotifications({ uid: req.user.id, page, limit: 20, unreadOnly });
	res.json(makeResponse(true, result));
}));

router.post('/:id/read', requireLogin, asyncJsonHandler(async (req, res) => {
	const ok = await notificationService.markRead(parseInt(req.params.id), req.user.id);
	res.json(makeResponse(ok));
}));

router.post('/read-all', requireLogin, asyncJsonHandler(async (req, res) => {
	await notificationService.markAllRead(req.user.id);
	res.json(makeResponse(true));
}));

export default router;

