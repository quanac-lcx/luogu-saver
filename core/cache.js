/**
 * Redis caching utility with bypass support
 * Supports bypassing cache when _bypassRedis=1 is present in query parameters
 */

/**
 * Check if cache should be bypassed based on query parameters
 * @param {Object} req - Express request object
 * @returns {boolean} true if cache should be bypassed
 */
function shouldBypassCache(req) {
	return req && req.query && req.query._bypassRedis === '1';
}

/**
 * Cached execution wrapper with bypass support
 * @param {Object} options - Configuration object
 * @param {string} options.cacheKey - The Redis cache key
 * @param {number} options.ttl - Time to live in seconds
 * @param {Function} options.fetchFn - Function to fetch data when cache miss
 * @param {Object} options.req - Express request object (for bypass check)
 * @returns {Promise} - The cached or fresh data
 */
export async function withCache({ cacheKey, ttl, fetchFn, req }) {
	// Check if cache should be bypassed
	if (shouldBypassCache(req)) {
		return await fetchFn();
	}
	
	try {
		// Try to get from cache first
		const cachedResult = await redis.get(cacheKey);
		if (cachedResult) {
			return JSON.parse(cachedResult);
		}
	} catch (error) {
		// If cache fails, continue to fetch fresh data
		logger.warn(`Cache read failed for key ${cacheKey}: ${error.message}`);
	}
	
	// Fetch fresh data
	const result = await fetchFn();
	
	// Cache the result if TTL is specified
	if (ttl && result !== null && result !== undefined) {
		try {
			await redis.set(cacheKey, JSON.stringify(result), ttl);
		} catch (error) {
			// Log but don't fail if cache write fails
			logger.warn(`Cache write failed for key ${cacheKey}: ${error.message}`);
		}
	}
	
	return result;
}

/**
 * Invalidate cache keys
 * @param {string|Array<string>} keys - Single key or array of keys to invalidate
 */
export async function invalidateCache(keys) {
	try {
		if (typeof keys === 'string') {
			await redis.del(keys);
		} else if (Array.isArray(keys)) {
			if (keys.length > 0) {
				await redis.redis.del(...keys);
			}
		}
	} catch (error) {
		logger.warn(`Cache invalidation failed: ${error.message}`);
	}
}

/**
 * Invalidate cache keys by pattern
 * @param {string} pattern - Pattern to match keys (e.g., 'problems:*')
 */
export async function invalidateCacheByPattern(pattern) {
	try {
		const keys = await redis.redis.keys(pattern);
		if (keys.length > 0) {
			await redis.redis.del(...keys);
		}
	} catch (error) {
		logger.warn(`Cache pattern invalidation failed for ${pattern}: ${error.message}`);
	}
}