/**
 * Paste Service Module
 * 
 * This module provides services for managing paste content, including:
 * - Paste creation with automatic cache invalidation
 * - Cached retrieval of pastes with content rendering
 * - Automatic cache bypass support
 * 
 * @author Copilot
 */

import Paste from "../models/paste.js";
import { withCache, invalidateCache } from "../core/cache.js";

/**
 * Save a new paste and invalidate related caches
 * 
 * Creates a new paste entry and automatically invalidates related cache entries
 * to ensure data consistency across the application.
 * 
 * @param {Object} task - Task object containing paste metadata
 * @param {string} task.aid - Paste ID
 * @param {Object} obj - Paste data object
 * @param {string} obj.content - Paste content
 * @param {Object} obj.userData - User data with uid
 */
export async function savePaste(task, obj) {
	// Create new paste entry
	const newPaste = Paste.create({
		id: task.aid,
		title: task.aid,
		content: obj.content,
		author_uid: obj.userData.uid
	});
	await newPaste.save();
	
	// Invalidate related cache entries
	await Promise.all([
		invalidateCache(`paste:${task.aid}`),
		invalidateCache(['statistics:full', 'statistics:counts'])
	]);
}

/**
 * Get paste by ID with caching support
 * 
 * Retrieves a specific paste by its ID, including rendered content.
 * Results are cached for 30 minutes. Throws error for deleted pastes.
 * 
 * @param {string} id - Paste ID (must be 8 characters)
 * @returns {Promise<Object|null>} Object with paste and renderedContent, or null if not found
 * @throws {Error} If ID is invalid or paste is deleted
 */
export async function getPasteById(id) {
	if (id.length !== 8) throw new Error("Invalid paste ID.");
	
	return await withCache({
		cacheKey: `paste:${id}`,
		ttl: 1800, // 30 minutes
		fetchFn: async () => {
			const paste = await Paste.findById(id);
			if (!paste) return null;
			
			// Load relationships and format dates
			await paste.loadRelationships();
			paste.formatDate();
			
			// Check if paste is deleted
			if (paste.deleted) throw new Error(`The paste (ID: ${id}) has been deleted: ${paste.deleted_reason}`);
			
			// Process and render content
			const sanitizedContent = utils.sanitizeLatex(paste.content);
			const renderedContent = renderer.renderMarkdown(sanitizedContent);
			
			return { paste, renderedContent };
		}
	});
}