import Task from "../models/task.js";

export default async () => {
	try {
		await Task.deleteExpired();
	} catch (error) {
		logger.warn("An error occurred while cleaning up expired tasks: " + error.message);
	}
}
