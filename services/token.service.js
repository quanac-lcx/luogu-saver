import Token from "../models/token.js";
import { defaultHeaders, fetchContent } from "../core/request.js";
import { handleFetch } from "../handlers/index.handler.js";
import { withCache, invalidateCache } from "../core/cache.js";

export async function generateToken(pasteId, uid) {
	const url = `https://www.luogu.com/paste/${pasteId}`;
	const resp = await handleFetch(await fetchContent(url, defaultHeaders, { c3vk: "legacy" }), 1);
	
	if (!resp.success) {
		throw new Error(resp.message || "Failed to fetch paste content.");
	}
	
	const value = resp.data;
	
	const content = value.content || "";
	if (content !== "lgs_register_verification") {
		throw new Error("Verification content does not match.");
	}
	
	if (parseInt(uid) !== value.userData.uid) {
		throw new Error("UID does not match.");
	}
	
	let token = await Token.findOne({ where: { uid: parseInt(uid) } });
	if (token) {
		// Invalidate old token from cache
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
	
	// Cache the new token  
	// We directly cache it since it's new
	try {
		await redis.set(`token:${tokenText}`, JSON.stringify(token), 600);
	} catch (error) {
		logger.warn(`Failed to cache new token: ${error.message}`);
	}
	
	return tokenText;
}

export async function validateToken(tokenText, req = null) {
	return await withCache({
		cacheKey: `token:${tokenText}`,
		ttl: 600, // 10 minutes
		req,
		fetchFn: async () => {
			const token = await Token.findById(tokenText);
			return token || null;
		}
	});
}
