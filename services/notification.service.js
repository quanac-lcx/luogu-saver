// filepath: d:\WebstormProjects\luogu-saver\services\notification.service.js
import Notification from "../models/notification.js";
import { paginateQuery } from "../core/pagination.js";

/**
 * 创建站内通知
 * @param {number} uid 接收人
 * @param {Object} payload { type, title, content, link }
 */
export async function notify(uid, payload) {
	return await Notification.createFor(uid, payload);
}

/**
 * 获取用户通知（分页）
 */
export async function getUserNotifications({ uid, page, limit, unreadOnly = false }) {
	const where = { uid };
	if (unreadOnly) where.read = false;
	return await paginateQuery(Notification, {
		where,
		order: { created_at: 'DESC' },
		page: Math.max(parseInt(page) || 1, 1),
		limit: Math.max(parseInt(limit) || 20, 1),
		processItems: (item) => item.formatDate()
	});
}

/** 标记已读 */
export async function markRead(id, uid) {
	const n = await Notification.findById(id);
	if (!n || n.uid !== uid) return false;
	n.read = true;
	await n.save();
	return true;
}

/** 全部已读 */
export async function markAllRead(uid) {
	await Notification.repository
		.createQueryBuilder()
		.update()
		.set({ read: true })
		.where("uid = :uid AND `read` = false", { uid })
		.execute();
	return true;
}

