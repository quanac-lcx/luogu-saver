import Paste from "../models/paste.js";

export async function savePaste(task, obj) {
	const newPaste = Paste.create({
		id: task.aid,
		title: task.aid,
		content: obj.content,
		author_uid: obj.userData.uid
	});
	await newPaste.save();
	
	// Invalidate cache for this paste
	await global.redis.del(`paste:${task.aid}`);
	// Invalidate statistics cache since paste count may have changed
	await global.redis.del('statistics:full');
	await global.redis.del('statistics:counts');
}

export async function getPasteById(id) {
	if (id.length !== 8) throw new Error("Invalid paste ID.");
	
	const cacheKey = `paste:${id}`;
	
	// Try to get from cache first
	const cachedResult = await global.redis.get(cacheKey);
	if (cachedResult) {
		return JSON.parse(cachedResult);
	}
	
	const paste = await Paste.findById(id);
	if (!paste) return null;
	
	await paste.loadRelationships();
	paste.formatDate();
	
	if (paste.deleted) throw new Error(paste.deleted_reason);
	
	const sanitizedContent = utils.sanitizeLatex(paste.content);
	const renderedContent = renderer.renderMarkdown(sanitizedContent);
	
	const result = { paste, renderedContent };
	
	// Cache for 30 minutes (1800 seconds)
	await global.redis.set(cacheKey, JSON.stringify(result), 1800);
	
	return result;
}