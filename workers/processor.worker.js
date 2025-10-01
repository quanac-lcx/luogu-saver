import { updateTask } from "../services/task.service.js";
import { saveArticle } from "../services/article.service.js";
import { savePaste } from "../services/paste.service.js";
import { fetchContent } from "../core/request.js";
import { handleFetch } from "../handlers/index.handler.js";
import { SystemError } from "../core/errors.js";

export async function executeTask(task) {
	try {
		logger.debug(`Start processing task #${task.id}, type=${task.type}`);
		await updateTask(task.id, 1, "Processing...");
		const resp = await handleFetch(
			await fetchContent(
				task.url,
				task.headers,
				{ c3vk: task.type === 1 ? "legacy": "new" }
			),
			task.type
		);
		if (!resp.success) {
			throw new SystemError(resp.message);
		}
		const obj = resp.data;
		if (task.type === 0) {
			await saveArticle(task, obj, async (progress, message) => { await updateTask(task.id, progress, message); });
		}
		else {
			await savePaste(task, obj);
			await updateTask(task.id, 2, "Task completed successfully.");
		}
	} catch (err) {
		logger.error(`Task #${task.id} failed: ${err.message}`);
		await updateTask(task.id, 3, err.message);
	}
}
