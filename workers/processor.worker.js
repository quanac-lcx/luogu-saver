import { updateTask } from "../services/task.service.js";
import { saveArticle } from "../services/article.service.js";
import { savePaste } from "../services/paste.service.js";
import { fetchContent } from "../core/request.js";
import { handleFetch } from "../handlers/index.handler.js";
import { SystemError, NetworkError, DatabaseError, logError } from "../core/errors.js";

export async function executeTask(task) {
	try {
		logger.debug(`开始处理任务 #${task.id}, 类型: ${task.type}`);
		await updateTask(task.id, 1, "处理中...");
		
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
			if (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT' ||
			    err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' ||
			    err.message?.includes('timeout') || err.message?.includes('network')) {
				throw new NetworkError(`爬取内容失败: ${err.message}`);
			}
			throw err;
		}
		
		if (!resp.success) {
			throw new NetworkError(resp.message);
		}
		const obj = resp.data;
		
		try {
			if (task.type === 0) {
				await saveArticle(task, obj, async (progress, message) => { 
					await updateTask(task.id, progress, message); 
				});
			} else {
				await savePaste(task, obj);
				await updateTask(task.id, 2, "任务完成");
			}
		} catch (err) {
			if (err.name === 'QueryFailedError' || err.code?.startsWith('ER_') ||
			    err.message?.includes('database') || err.message?.includes('query')) {
				throw new DatabaseError(`保存数据失败: ${err.message}`);
			}
			throw err;
		}
	} catch (err) {
		err.message = `任务 #${task.id} 执行失败: ${err.message}`;
		await logError(err, null, logger);
		await updateTask(task.id, 3, err.message);
	}
}
