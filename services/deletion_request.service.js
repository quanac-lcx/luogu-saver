/**
 * 删除申请服务模块
 * 
 * 该模块提供内容删除申请管理功能，包括：
 * - 用户提交删除申请（需验证作者身份和理由长度）
 * - 管理员审核删除申请（批准、拒绝、忽略）
 * - 批准时自动软删除内容并记录原因
 * 
 * @author Copilot
 */

import DeletionRequest from "../models/deletion_request.js";
import Article from "../models/article.js";
import Paste from "../models/paste.js";
import { ValidationError, NotFoundError, ForbiddenError } from "../core/errors.js";
import { paginateQuery } from "../core/pagination.js";
import { invalidateCache } from "../core/cache.js";

/**
 * 用户提交删除申请
 * 
 * @param {string} type - 内容类型（'article' 或 'paste'）
 * @param {string} itemId - 内容 ID
 * @param {number} requesterUid - 申请人用户 ID
 * @param {string} reason - 删除理由（至少15字符）
 * @returns {Promise<Object>} 包含成功消息和申请ID的对象
 */
export async function createDeletionRequest(type, itemId, requesterUid, reason) {
	if (type !== 'article' && type !== 'paste') {
		throw new ValidationError("不支持的内容类型");
	}
	
	if (!reason || reason.trim().length < 15) {
		throw new ValidationError("删除理由至少需要15个字符");
	}
	
	const Model = type === 'article' ? Article : Paste;
	const item = await Model.findById(itemId);
	
	if (!item) {
		throw new NotFoundError(`${type === 'article' ? '文章' : '剪贴板'}不存在`);
	}
	
	if (item.deleted) {
		throw new ValidationError("该内容已被删除，无需重复申请");
	}
	
	const existingRequest = await DeletionRequest.findUserPendingRequest(type, itemId, requesterUid);
	if (existingRequest) {
		throw new ValidationError("您已经提交过删除申请，请等待管理员处理");
	}
	
	const request = DeletionRequest.create({
		type,
		item_id: itemId,
		requester_uid: requesterUid,
		reason: reason.trim(),
		status: 'pending'
	});
	
	await request.save();
	
	return {
		message: "删除申请已提交，请等待管理员审核",
		requestId: request.id
	};
}

/**
 * 获取删除申请列表（带分页和筛选）
 * 
 * @param {number} page - 页码
 * @param {number} limit - 每页数量
 * @param {string} status - 状态筛选（'pending', 'approved', 'rejected', 'ignored'）
 * @param {string} type - 类型筛选（'article', 'paste'）
 * @returns {Promise<Object>} 包含申请列表、分页信息的对象
 */
export async function getDeletionRequests(page = 1, limit = 20, status = '', type = '') {
	const whereCondition = {};
	
	if (status) {
		whereCondition.status = status;
	}
	
	if (type) {
		whereCondition.type = type;
	}
	
	return await paginateQuery(DeletionRequest, {
		where: whereCondition,
		order: { created_at: 'DESC' },
		page,
		limit,
		extra: { status, type },
		processItems: async (request) => {
			await request.loadRelationships();
			request.formatDate();
		}
	});
}

/**
 * 批准删除申请
 * 
 * 批准后会自动软删除对应内容，并将删除理由设置为用户提交的理由
 * 
 * @param {number} requestId - 申请 ID
 * @param {number} adminUid - 管理员用户 ID
 * @param {string} adminNote - 管理员备注（可选）
 * @returns {Promise<Object>} 包含成功消息的对象
 */
export async function approveDeletionRequest(requestId, adminUid, adminNote = '') {
	const request = await DeletionRequest.findById(requestId);
	
	if (!request) {
		throw new NotFoundError("删除申请不存在");
	}
	
	if (request.status !== 'pending') {
		throw new ValidationError("该申请已被处理");
	}
	
	// 获取对应的内容
	const Model = request.type === 'article' ? Article : Paste;
	const item = await Model.findById(request.item_id);
	
	if (!item) {
		throw new NotFoundError("要删除的内容不存在");
	}
	
	if (item.deleted) {
		throw new ValidationError("该内容已被删除");
	}
	
	// 软删除内容
	item.deleted = true;
	item.deleted_reason = request.reason;
	await item.save();
	
	// 更新申请状态
	request.status = 'approved';
	request.admin_uid = adminUid;
	request.admin_note = adminNote.trim();
	request.processed_at = new Date();
	await request.save();
	
	// 使缓存失效
	await invalidateCache(`${request.type}:${request.item_id}`);
	
	return {
		message: "已批准删除申请并删除内容"
	};
}

/**
 * 拒绝删除申请
 * 
 * @param {number} requestId - 申请 ID
 * @param {number} adminUid - 管理员用户 ID
 * @param {string} adminNote - 管理员备注（说明拒绝理由）
 * @returns {Promise<Object>} 包含成功消息的对象
 */
export async function rejectDeletionRequest(requestId, adminUid, adminNote = '') {
	const request = await DeletionRequest.findById(requestId);
	
	if (!request) {
		throw new NotFoundError("删除申请不存在");
	}
	
	if (request.status !== 'pending') {
		throw new ValidationError("该申请已被处理");
	}
	
	request.status = 'rejected';
	request.admin_uid = adminUid;
	request.admin_note = adminNote.trim();
	request.processed_at = new Date();
	await request.save();
	
	return {
		message: "已拒绝删除申请"
	};
}

/**
 * 忽略删除申请
 * 
 * @param {number} requestId - 申请 ID
 * @param {number} adminUid - 管理员用户 ID
 * @param {string} adminNote - 管理员备注（可选）
 * @returns {Promise<Object>} 包含成功消息的对象
 */
export async function ignoreDeletionRequest(requestId, adminUid, adminNote = '') {
	const request = await DeletionRequest.findById(requestId);
	
	if (!request) {
		throw new NotFoundError("删除申请不存在");
	}
	
	if (request.status !== 'pending') {
		throw new ValidationError("该申请已被处理");
	}
	
	request.status = 'ignored';
	request.admin_uid = adminUid;
	request.admin_note = adminNote.trim();
	request.processed_at = new Date();
	await request.save();
	
	return {
		message: "已忽略删除申请"
	};
}

/**
 * 获取待处理删除申请的数量
 * 
 * @returns {Promise<number>} 待处理申请数量
 */
export async function getPendingRequestsCount() {
	return await DeletionRequest.count({
		where: { status: 'pending' }
	});
}
