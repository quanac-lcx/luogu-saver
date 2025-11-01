import Notification from "../models/notification.js";

export default async function notificationsMiddleware(req, res, next) {
	res.locals.unreadNotifications = 0;
	if (!req.user) return next();
	try {
		const count = await Notification.count({ where: { uid: req.user.id, read: false } });
		res.locals.unreadNotifications = count;
	} catch (e) {
		if (typeof logger !== 'undefined') logger.warn('加载通知计数失败: ' + e.message);
	}
	return next();
}

