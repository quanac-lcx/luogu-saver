/**
 * Token 服务模块
 * 
 * 该模块提供用户认证 Token 服务，包括：
 * - 从粘贴板验证生成 Token
 * - 为性能优化而缓存的 Token 验证
 * - 与缓存同步的 Token 生命周期管理
 * 
 * @author Copilot
 */

import Token from "../models/token.js";
import { defaultHeaders, fetchContent } from "../core/request.js";
import { handleFetch } from "../handlers/index.handler.js";
import { withCache, invalidateCache } from "../core/cache.js";
import { ValidationError, ExternalServiceError } from "../core/errors.js";

/**
 * 从粘贴板验证生成认证 Token
 * 
 * 通过包含验证内容的特殊粘贴板验证用户身份，
 * 然后创建并缓存新的认证 Token。移除用户的任何现有 Token
 * 并使其缓存条目失效。
 * 
 * @param {string} pasteId - 验证粘贴板的 ID
 * @param {string|number} uid - 要生成Token的用户 ID
 * @returns {Promise<string>} 生成的 Token 字符串
 * @throws {Error} 如果粘贴板获取失败、内容不匹配或 UID 不匹配
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
		logger.warn(`创建 Token 时出错: ${error.message}`);
	}
	
	return tokenText;
}

/**
 * 验证认证 Token（支持缓存）
 * 
 * 检查 Token 是否有效并返回关联的 Token 对象。
 * 为了减少频繁访问 Token 的数据库查询，结果缓存 10 分钟。
 * 
 * @param {string} tokenText - 要验证的 Token 字符串
 * @returns {Promise<Object|null>} 如果有效返回 Token 对象，无效则返回 null
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
