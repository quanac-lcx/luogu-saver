import { updateTask } from "../services/task.service.js";
import { saveArticle } from "../services/article.service.js";
import { savePaste } from "../services/paste.service.js";
import { fetchContent } from "../core/request.js";
import { handleFetch } from "../handlers/index.handler.js";
import { SystemError, NetworkError, DatabaseError } from "../core/errors.js";

export async function executeTask(task) {
	try {
		logger.debug(`Start processing task #${task.id}, type=${task.type}`);
		await updateTask(task.id, 1, "Processing...");
		
		let resp;
		try {
			resp = await handleFetch(
				await fetchContent(
					task.url,
					task.headers,
					{ c3vk: task.type === 1 ? "legacy": "new" }
				),
				task.type
			);
		} catch (err) {
			// Network-related errors during fetch
			if (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT' || 
			    err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' ||
			    err.message?.includes('timeout') || err.message?.includes('network')) {
				throw new NetworkError(`Failed to fetch content: ${err.message}`);
			}
			throw err;
		}
		
		if (!resp.success) {
			throw new SystemError(resp.message);
		}
		const obj = resp.data;
		
		try {
			if (task.type === 0) {
				await saveArticle(task, obj, async (progress, message) => { 
					await updateTask(task.id, progress, message); 
				});
			} else {
				await savePaste(task, obj);
			}
			await updateTask(task.id, 2, "Task completed successfully.");
		} catch (err) {
			// Database-related errors during save
			if (err.name === 'QueryFailedError' || err.code?.startsWith('ER_') || 
			    err.message?.includes('database') || err.message?.includes('query')) {
				throw new DatabaseError(`Failed to save data: ${err.message}`);
			}
			throw err;
		}
	} catch (err) {
		logger.error(`Task #${task.id} failed: ${err.message}`);
		await updateTask(task.id, 3, err.message);
	}
}
