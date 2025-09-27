/**
 * Token Service Module
 * 
 * This module provides user authentication token services, including:
 * - Token generation from paste verification
 * - Cached token validation for performance
 * - Token lifecycle management with cache synchronization
 * 
 * @author Copilot
 */

import Token from "../models/token.js";
import { defaultHeaders, fetchContent } from "../core/request.js";
import { handleFetch } from "../handlers/index.handler.js";
import { withCache, invalidateCache } from "../core/cache.js";

/**
 * Generate authentication token from paste verification
 * 
 * Validates user identity through a special paste containing verification content,
 * then creates and caches a new authentication token. Removes any existing tokens
 * for the user and invalidates their cache entries.
 * 
 * @param {string} pasteId - ID of the verification paste
 * @param {string|number} uid - User ID to generate token for
 * @returns {Promise<string>} Generated token string
 * @throws {Error} If paste fetch fails, content doesn't match, or UID mismatch
 */
export async function generateToken(pasteId, uid) {
	// Fetch and validate the verification paste
	const url = `https://www.luogu.com/paste/${pasteId}`;
	const resp = await handleFetch(await fetchContent(url, defaultHeaders, { c3vk: "legacy" }), 1);
	
	if (!resp.success) {
		throw new Error(resp.message || "Failed to fetch paste content.");
	}
	
	const value = resp.data;
	
	// Verify paste content matches expected verification string
	const content = value.content || "";
	if (content !== "lgs_register_verification") {
		throw new Error("Verification content does not match.");
	}
	
	// Verify user ID matches paste owner
	if (parseInt(uid) !== value.userData.uid) {
		throw new Error("UID does not match.");
	}
	
	// Remove existing token for this user
	let token = await Token.findOne({ where: { uid: parseInt(uid) } });
	if (token) {
		// Invalidate old token from cache before removal
		await invalidateCache(`token:${token.id}`);
		await token.remove();
	}
	
	// Generate new token
	const tokenText = utils.generateRandomString(32);
	token = Token.create({
		id: tokenText,
		uid: parseInt(uid),
		role: 0
	});
	await token.save();
	
	// Cache the new token immediately for performance
	try {
		await redis.set(`token:${tokenText}`, JSON.stringify(token), 600);
	} catch (error) {
		logger.warn(`Failed to cache new token: ${error.message}`);
	}
	
	return tokenText;
}

/**
 * Validate authentication token with caching support
 * 
 * Checks if a token is valid and returns the associated token object.
 * Results are cached for 10 minutes to reduce database queries for
 * frequently accessed tokens.
 * 
 * @param {string} tokenText - Token string to validate
 * @returns {Promise<Object|null>} Token object if valid, null if invalid
 */
export async function validateToken(tokenText) {
	return await withCache({
		cacheKey: `token:${tokenText}`,
		ttl: 600, // 10 minutes
		fetchFn: async () => {
			const token = await Token.findById(tokenText);
			return token || null;
		}
	});
}
