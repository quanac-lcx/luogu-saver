/**
 * Redis Caching Utility with Automatic Bypass Support
 * 
 * This module provides a comprehensive caching solution with automatic
 * bypass detection through middleware context. It handles cache operations
 * with proper error handling and fallback mechanisms.
 * 
 * Features:
 * - Automatic cache bypass detection (no need to pass request objects)
 * - Error-resilient operations (failures don't break functionality)
 * - Pattern-based cache invalidation
 * - Comprehensive logging for debugging
 * 
 * @author Copilot
 */

import { shouldBypassCache } from "../middleware/cache_context.js";

/**
 * Cached execution wrapper with automatic bypass support
 * 
 * This function provides a complete caching solution that:
 * - Automatically detects cache bypass requests via middleware context
 * - Handles cache read/write errors gracefully
 * - Provides fallback to fresh data when cache operations fail
 * - Supports configurable TTL for different data types
 * 
 * @param {Object} options - Configuration object
 * @param {string} options.cacheKey - The Redis cache key to use
 * @param {number} options.ttl - Time to live in seconds (0 = no caching)
 * @param {Function} options.fetchFn - Function to fetch data when cache miss or bypass
 * @returns {Promise<*>} - The cached or fresh data
 * 
 * @example
 * const result = await withCache({
 *   cacheKey: 'article:123',
 *   ttl: 1800, // 30 minutes
 *   fetchFn: async () => await Article.findById('123')
 * });
 */
export async function withCache({ cacheKey, ttl, fetchFn }) {
	// Check if cache should be bypassed via middleware context
	if (shouldBypassCache()) {
		logger.debug(`Cache bypassed for key: ${cacheKey}`);
		return await fetchFn();
	}
	
	// Attempt to read from cache
	try {
		const cachedResult = await redis.get(cacheKey);
		if (cachedResult) {
			logger.debug(`Cache hit for key: ${cacheKey}`);
			return JSON.parse(cachedResult);
		}
		logger.debug(`Cache miss for key: ${cacheKey}`);
	} catch (error) {
		// Log cache read errors but continue with fresh data fetch
		logger.warn(`Cache read failed for key ${cacheKey}: ${error.message}`);
	}
	
	// Fetch fresh data from the original source
	const result = await fetchFn();
	
	// Attempt to cache the result if TTL is specified and result is valid
	if (ttl && result !== null && result !== undefined) {
		try {
			await redis.set(cacheKey, JSON.stringify(result), ttl);
			logger.debug(`Cached result for key: ${cacheKey}, TTL: ${ttl}s`);
		} catch (error) {
			// Log cache write errors but don't fail the request
			logger.warn(`Cache write failed for key ${cacheKey}: ${error.message}`);
		}
	}
	
	return result;
}

/**
 * Invalidate specific cache keys
 * 
 * This function handles the removal of cached data when the underlying
 * data has been modified. It supports both single keys and arrays of keys.
 * 
 * @param {string|Array<string>} keys - Single key or array of keys to invalidate
 * 
 * @example
 * await invalidateCache('article:123');
 * await invalidateCache(['article:123', 'recent_articles:10']);
 */
export async function invalidateCache(keys) {
	try {
		if (typeof keys === 'string') {
			await redis.del(keys);
			logger.debug(`Invalidated cache key: ${keys}`);
		} else if (Array.isArray(keys)) {
			if (keys.length > 0) {
				await redis.redis.del(...keys);
				logger.debug(`Invalidated cache keys: ${keys.join(', ')}`);
			}
		}
	} catch (error) {
		logger.warn(`Cache invalidation failed: ${error.message}`);
	}
}

/**
 * Invalidate cache keys by pattern matching
 * 
 * This function finds all keys matching a pattern and removes them.
 * Useful for bulk invalidation of related cache entries.
 * 
 * @param {string} pattern - Pattern to match keys (e.g., 'problems:*', 'recent_articles:*')
 * 
 * @example
 * await invalidateCacheByPattern('problems:*'); // Remove all problem cache entries
 * await invalidateCacheByPattern('recent_articles:*'); // Remove all recent article caches
 */
export async function invalidateCacheByPattern(pattern) {
	try {
		const keys = await redis.redis.keys(pattern);
		if (keys.length > 0) {
			await redis.redis.del(...keys);
			logger.debug(`Invalidated ${keys.length} cache keys matching pattern: ${pattern}`);
		} else {
			logger.debug(`No cache keys found for pattern: ${pattern}`);
		}
	} catch (error) {
		logger.warn(`Cache pattern invalidation failed for ${pattern}: ${error.message}`);
	}
}