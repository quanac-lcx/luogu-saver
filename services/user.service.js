/**
 * 用户服务模块
 * 
 * 该模块提供用户管理相关的服务功能，包括：
 * - 用户数据的创建和更新操作
 * - 用户信息的插入或更新（Upsert）操作
 * - 用户属性管理（名称、颜色等）
 * - 用户个人资料保存
 * 
 * @author Copilot
 */

import User from "../models/user.js";
import { withCache, invalidateCache } from "../core/cache.js";
import { ValidationError, NotFoundError } from "../core/errors.js";
import { sanitizeLatex } from "../core/utils.js";
import UserIntroduction from "../models/user_introduction.js";

/**
 * 插入或更新用户数据
 * 
 * 根据提供的用户数据创建新用户或更新现有用户信息。
 * 如果用户不存在则创建新用户，如果存在则更新用户属性。
 * 
 * @param {Object} userData - 用户数据对象
 * @param {string|number} userData.uid - 用户ID
 * @param {string} userData.name - 用户名
 * @param {string} userData.color - 用户颜色标识
 * @returns {Promise<void>}
 */
export async function upsertUser(userData) {
	if (!userData || !userData.uid) return;
	const { uid, name, color } = userData;
	
	const user = (await User.findById(uid)) || User.create({ id: uid });
	user.name = name;
	user.color = color;
	await user.save();
}

/**
 * 保存用户个人资料
 * 
 * 保存或更新用户的个人资料介绍。
 * 
 * @param {Object} task - 包含用户元数据的任务对象
 * @param {string|number} task.aid - 用户ID
 * @param {Object} obj - 用户数据对象
 * @param {string} obj.introduction - 用户介绍
 * @param {Object} obj.userData - 包含uid、name、color的用户数据
 */
export async function saveUserProfile(task, obj) {
	const uid = parseInt(task.aid);
	const introduction = (await UserIntroduction.findById(uid)) || UserIntroduction.create({ id: uid });
	await upsertUser(obj.userData);
	
	introduction.content = obj.introduction;
	await introduction.save();
	
	await Promise.all([
		invalidateCache(`user:${uid}`),
		invalidateCache(['statistics:full', 'statistics:counts'])
	]);
}

/**
 * 通过ID获取用户资料（支持缓存）
 * 
 * 通过ID检索特定用户的资料，包括渲染的介绍内容。
 * 结果缓存30分钟。
 * 
 * @param {string|number} id - 用户ID
 * @returns {Promise<Object|null>} 包含user和renderedContent的对象，如果未找到则返回null
 * @throws {ValidationError} 如果ID无效
 */
export async function getUserProfileById(id) {
	const uid = parseInt(id);
	if (!uid || isNaN(uid)) throw new ValidationError("用户 ID 无效");
	
	return await withCache({
		cacheKey: `user:${uid}`,
		ttl: 1800,
		fetchFn: async () => {
			const introduction = await UserIntroduction.findById(uid);
			if (!introduction) return null;
			
			await introduction.loadRelationships();
			introduction.formatDate();
			
			const sanitizedContent = sanitizeLatex(introduction.content);
			let renderedContent = renderer.renderMarkdown(sanitizedContent);
			
			return { introduction, renderedContent };
		}
	});
}
