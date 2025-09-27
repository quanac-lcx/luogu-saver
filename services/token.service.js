import Token from "../models/token.js";
import { defaultHeaders, fetchContent } from "../core/request.js";
import { handleFetch } from "../handlers/index.handler.js";

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
		await global.redis.del(`token:${token.id}`);
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
	await global.redis.set(`token:${tokenText}`, JSON.stringify(token), 600);
	
	return tokenText;
}

export async function validateToken(tokenText) {
	const cacheKey = `token:${tokenText}`;
	
	// Try to get from cache first
	const cachedResult = await global.redis.get(cacheKey);
	if (cachedResult) {
		return JSON.parse(cachedResult);
	}
	
	const token = await Token.findById(tokenText);
	const result = token || null;
	
	// Cache for 10 minutes (600 seconds) since tokens don't change frequently
	await global.redis.set(cacheKey, JSON.stringify(result), 600);
	
	return result;
}
