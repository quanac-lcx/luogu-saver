/**
 * 缓存上下文中间件
 *
 * 此中间件自动检测缓存绕过请求并将信息存储在
 * 缓存工具可访问的全局上下文中。
 * 这消除了手动将请求对象传递给服务方法的需要。
 *
 * 用法:
 * - 在任何 URL 后添加 ?_bypassRedis=1 来绕过 Redis 缓存
 * - 缓存工具将自动检测并获取新数据
 *
 * @author Copilot
 */

import { AsyncLocalStorage } from 'async_hooks';

const cacheContextStorage = new AsyncLocalStorage();

/**
 * 处理缓存上下文的中间件函数
 * 检测缓存绕过参数并为请求生命周期存储上下文
 *
 * @param {Object} req - Express 请求对象
 * @param {Object} res - Express 响应对象
 * @param {Function} next - 下一个中间件函数
 */
function cacheContextMiddleware(req, res, next) {
	const context = {
		shouldBypassCache: req.query && req.query._bypassRedis === '1',
		requestId: req.headers['x-request-id'] || `${Date.now()}-${Math.random()}`,
		originalUrl: req.originalUrl
	};
	
	cacheContextStorage.run(context, () => {
		next();
	});
}

/**
 * 获取当前缓存上下文
 * 返回用于缓存绕过决策的上下文信息
 *
 * @returns {Object|null} 缓存上下文对象，如果不在中间件上下文中则返回 null
 */
export function getCacheContext() {
	return cacheContextStorage.getStore() || null;
}

/**
 * 检查当前请求是否应该绕过缓存
 * 使用异步本地存储访问请求上下文，无需手动传递
 *
 * @returns {boolean} 如果应该绕过缓存则返回 true
 */
export function shouldBypassCache() {
	const context = getCacheContext();
	return context ? context.shouldBypassCache : false;
}

export default cacheContextMiddleware;