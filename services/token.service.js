/**
 * Token服务模块
 * 
 * 该模块提供用户认证Token服务，包括：
 * - 从粘贴板验证生成Token
 * - 为性能优化而缓存的Token验证
 * - 与缓存同步的Token生命周期管理
 * 
 * @author Copilot
 */

import Token from "../models/token.js";
import { defaultHeaders, fetchContent } from "../core/request.js";
import { handleFetch } from "../handlers/index.handler.js";
import { withCache, invalidateCache } from "../core/cache.js";
import { ValidationError, ExternalServiceError } from "../core/errors.js";

/**
 * 从粘贴板验证生成认证Token
 * 
 * 通过包含验证内容的特殊粘贴板验证用户身份，
 * 然后创建并缓存新的认证Token。移除用户的任何现有Token
 * 并使其缓存条目失效。
 * 
 * @param {string} pasteId - 验证粘贴板的ID
 * @param {string|number} uid - 要生成Token的用户ID
 * @returns {Promise<string>} 生成的Token字符串
 * @throws {Error} 如果粘贴板获取失败、内容不匹配或UID不匹配
 */
export async function generateToken(pasteId, uid) {
	const url = `https://www.luogu.com/paste/${pasteId}`;
	const resp = await handleFetch(await fetchContent(url, defaultHeaders, { c3vk: "legacy" }), 1);
	
	if (!resp.success) {
		throw new ExternalServiceError(resp.message || "获取剪贴板内容失败", "Luogu API");
	}
	
	const value = resp.data;
	
	const content = value.content || "";
	if (content !== "lgs_register_verification") {
		throw new ValidationError("验证内容不匹配");
	}
	
	if (parseInt(uid) !== value.userData.uid) {
		throw new ValidationError("用户 ID 不匹配");
	}
	
	let token = await Token.findOne({ where: { uid: parseInt(uid) } });
	if (token) {
		await invalidateCache(`token:${token.id}`);
		await token.remove();
	}
	
	const tokenText = utils.generateRandomString(32);
	token = Token.create({
		id: tokenText,
		uid: parseInt(uid),
		role: 0
	});
	await token.save();
	
	try {
		await redis.set(`token:${tokenText}`, JSON.stringify(token), 600);
	} catch (error) {
		logger.warn(`Failed to cache new token: ${error.message}`);
	}
	
	return tokenText;
}

/**
 * 验证认证Token（支持缓存）
 * 
 * 检查Token是否有效并返回关联的Token对象。
 * 为了减少频繁访问Token的数据库查询，结果缓存10分钟。
 * 
 * @param {string} tokenText - 要验证的Token字符串
 * @returns {Promise<Object|null>} 如果有效返回Token对象，无效则返回null
 */
export async function validateToken(tokenText) {
	return await withCache({
		cacheKey: `token:${tokenText}`,
		ttl: 600,
		fetchFn: async () => {
			const token = await Token.findById(tokenText);
			return token || null;
		}
	});
}
