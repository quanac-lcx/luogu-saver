import Task from "../models/Task.js";

export default async () => {
	try {
		await Task.deleteExpired();
	} catch (error) {
		logger.warn("An error occurred while cleaning up expired tasks: " + error.message);
	}
}