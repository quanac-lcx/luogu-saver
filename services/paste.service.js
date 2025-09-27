import Paste from "../models/paste.js";
import { withCache, invalidateCache } from "../core/cache.js";

export async function savePaste(task, obj) {
	const newPaste = Paste.create({
		id: task.aid,
		title: task.aid,
		content: obj.content,
		author_uid: obj.userData.uid
	});
	await newPaste.save();
	
	// Invalidate caches
	await Promise.all([
		invalidateCache(`paste:${task.aid}`),
		invalidateCache(['statistics:full', 'statistics:counts'])
	]);
}

export async function getPasteById(id, req = null) {
	if (id.length !== 8) throw new Error("Invalid paste ID.");
	
	return await withCache({
		cacheKey: `paste:${id}`,
		ttl: 1800, // 30 minutes
		req,
		fetchFn: async () => {
			const paste = await Paste.findById(id);
			if (!paste) return null;
			
			await paste.loadRelationships();
			paste.formatDate();
			
			if (paste.deleted) throw new Error(paste.deleted_reason);
			
			const sanitizedContent = utils.sanitizeLatex(paste.content);
			const renderedContent = renderer.renderMarkdown(sanitizedContent);
			
			return { paste, renderedContent };
		}
	});
}