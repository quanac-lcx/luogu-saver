/**
 * 粘贴板服务模块
 * 
 * 该模块提供粘贴板内容管理相关的服务功能，包括：
 * - 粘贴板创建并自动缓存失效
 * - 带内容渲染的粘贴板缓存检索
 * - 自动缓存绕过支持
 * 
 * @author Copilot
 */

import Paste from "../models/paste.js";
import { withCache, invalidateCache } from "../core/cache.js";

/**
 * 保存新的粘贴板并使相关缓存失效
 * 
 * 创建新的粘贴板条目并自动使相关缓存条目失效，
 * 以确保整个应用程序的数据一致性。
 * 
 * @param {Object} task - 包含粘贴板元数据的任务对象
 * @param {string} task.aid - 粘贴板ID
 * @param {Object} obj - 粘贴板数据对象
 * @param {string} obj.content - 粘贴板内容
 * @param {Object} obj.userData - 包含uid的用户数据
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
 * 通过ID获取粘贴板（支持缓存）
 * 
 * 通过ID检索特定的粘贴板，包括渲染的内容。
 * 结果缓存30分钟。对已删除的粘贴板会抛出错误。
 * 
 * @param {string} id - 粘贴板ID（必须是8个字符）
 * @returns {Promise<Object|null>} 包含paste和renderedContent的对象，如果未找到则返回null
 * @throws {Error} 如果ID无效或粘贴板已被删除
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