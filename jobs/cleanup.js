import Task from "../models/task.js";

export default async () => {
	try {
		logger.debug("清理过期任务...");
		await Task.deleteExpired();
		logger.debug("过期任务清理完成");
	} catch (error) {
		logger.error("清理过期任务时出错: " + error.message);
	}
}
