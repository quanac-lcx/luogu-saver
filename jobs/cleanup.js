import Task from "../models/task.js";

export default async () => {
	try {
		logger.debug("Cleaning up expired tasks...");
		await Task.deleteExpired();
		logger.debug("Expired tasks cleanup completed.");
	} catch (error) {
		logger.warn("An error occurred while cleaning up expired tasks: " + error.message);
	}
}
