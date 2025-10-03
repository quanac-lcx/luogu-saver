/**
 * 带自动绕过支持的Redis缓存工具
 *
 * 此模块通过中间件上下文提供带自动绕过检测的综合缓存解决方案。
 * 它处理缓存操作，具有适当的错误处理和回退机制。
 *
 * 功能特性:
 * - 自动缓存绕过检测（无需传递请求对象）
 * - 错误弹性操作（失败不会破坏功能）
 * - 基于模式的缓存失效
 * - 用于调试的综合日志记录
 *
 * @author Copilot
 */

import { shouldBypassCache } from "../middleware/cache_context.js";

/**
 * 带自动绕过支持的缓存执行包装器
 *
 * 此函数提供完整的缓存解决���案：
 * - 通过中间件上下文自动检测缓存绕过请求
 * - 优雅地处理缓存读写错误
 * - 当缓存操作失败时提供新数据回退
 * - 支持不同数据类型的可配置TTL
 *
 * @param {Object} options - 配置对象
 * @param {string} options.cacheKey - 要使用的Redis缓存键
 * @param {number} options.ttl - 存活时间（秒）(0 = 不缓存)
 * @param {Function} options.fetchFn - 缓存未命中或绕过时获取数据的函数
 * @returns {Promise<*>} - 缓存的或新的数据
 *
 * @example
 * const result = await withCache({
 *   cacheKey: 'article:123',
 *   ttl: 1800, // 30分钟
 *   fetchFn: async () => await Article.findById('123')
 * });
 */
export async function withCache({ cacheKey, ttl, fetchFn }) {
	if (shouldBypassCache()) {
		return await fetchFn();
	}
	if (!isRedisConnected()) {
		logger.debug(`Redis 未连接，正在绕过缓存: ${cacheKey}`);
		return await fetchFn();
	}
	
	try {
		const cachedResult = await redis.get(cacheKey);
		if (cachedResult) {
			return JSON.parse(cachedResult);
		}
		logger.debug(`缓存未命中: ${cacheKey}`);
	} catch (error) {
		logger.warn(`缓存无法读取 ${cacheKey}: ${error.message}`);
	}
	
	const result = await fetchFn();
	
	if (ttl && result !== null && result !== undefined) {
		try {
			await redis.set(cacheKey, JSON.stringify(result), ttl);
			logger.debug(`已缓存键: ${cacheKey}, TTL: ${ttl} 秒`);
		} catch (error) {
			logger.warn(`缓存键 ${cacheKey} 失败: ${error.message}`);
		}
	}
	
	return result;
}

/**
 * 使特定缓存键失效
 *
 * 此函数处理当底层数据被修改时移除缓存数据。
 * 它支持单个键和键数组。
 *
 * @param {string|Array<string>} keys - 要使失效的单个键或键数组
 *
 * @example
 * await invalidateCache('article:123');
 * await invalidateCache(['article:123', 'recent_articles:10']);
 */
export async function invalidateCache(keys) {
	// Skip if Redis is not connected
	if (!isRedisConnected()) {
		logger.debug('Redis未连接，跳过缓存失效操作');
		return;
	}
	
	try {
		if (typeof keys === 'string') {
			await redis.del(keys);
			logger.debug(`已使缓存失效: ${keys}`);
		} else if (Array.isArray(keys)) {
			if (keys.length > 0) {
				await redis.redis。del(...keys);
				logger.debug(`已使缓存失效： ${keys.join(', ')}`);
			}
		}
	} catch (error) {
		logger.warn(`缓存失效操作失败: ${error.message}`);
	}
}

/**
 * 通过模式匹配使缓存键失效
 *
 * 此函数查找所有匹配模式的键并删除它们。
 * 对于批量失效相关缓存条目很有用。
 *
 * @param {string} pattern - 匹配键的模式 (例如: 'problems:*', 'recent_articles:*')
 *
 * @example
 * await invalidateCacheByPattern('problems:*'); // 删除所有问题缓存条目
 * await invalidateCacheByPattern('recent_articles:*'); // 删除所有最近文章缓存
 */
export async function invalidateCacheByPattern(pattern) {
	// 如果 Redis 未连接，则跳过。
	if (!isRedisConnected()) {
		logger.debug('Redis 未连接，跳过基于模式的缓存失效');
		return;
	}
	
	try {
		const keys = await this.redis.keys(pattern);
		if (keys.length > 0) {
			for (const key of keys) {
				await redis.del(key);
			}
			logger.debug(`已使 ${keys.length} 条缓存失效： ${pattern}`);
		} else {
			logger.debug(`未找到匹配模式的缓存: ${pattern}`);
		}
	} catch (error) {
		logger.warn(`匹配 ${pattern} 的缓存失效操作失败: ${error.message}`);
	}
}

/**
 * Check if Redis is connected
 * 
 * @returns {boolean} - Whether Redis is connected
 */
function isRedisConnected() {
	return redis && typeof redis.isConnected === 'function' && redis.isConnected();
}
