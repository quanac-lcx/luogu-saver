/**
 * Cache Context Middleware
 * 
 * This middleware automatically detects cache bypass requests and stores
 * the information in a global context accessible by the cache utility.
 * This eliminates the need to manually pass request objects to service methods.
 * 
 * Usage:
 * - Add ?_bypassRedis=1 to any URL to bypass Redis cache
 * - The cache utility will automatically detect this and fetch fresh data
 * 
 * @author Copilot
 */

import { AsyncLocalStorage } from 'async_hooks';

// Create async local storage for cache context
const cacheContextStorage = new AsyncLocalStorage();

/**
 * Middleware function to handle cache context
 * Detects cache bypass parameters and stores context for the request lifecycle
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object  
 * @param {Function} next - Next middleware function
 */
function cacheContextMiddleware(req, res, next) {
	// Create cache context with bypass information
	const context = {
		shouldBypassCache: req.query && req.query._bypassRedis === '1',
		requestId: req.headers['x-request-id'] || `${Date.now()}-${Math.random()}`,
		originalUrl: req.originalUrl
	};
	
	// Store context for this request's async execution
	cacheContextStorage.run(context, () => {
		next();
	});
}

/**
 * Get the current cache context
 * Returns context information for cache bypass decisions
 * 
 * @returns {Object|null} Cache context object or null if not in middleware context
 */
export function getCacheContext() {
	return cacheContextStorage.getStore() || null;
}

/**
 * Check if cache should be bypassed for the current request
 * Uses async local storage to access request context without manual passing
 * 
 * @returns {boolean} true if cache should be bypassed
 */
export function shouldBypassCache() {
	const context = getCacheContext();
	return context ? context.shouldBypassCache : false;
}

export default cacheContextMiddleware;