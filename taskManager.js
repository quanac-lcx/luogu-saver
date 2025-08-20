import db from "./db.js";
import {generateRandomString} from "./utils.js";

export async function createTask() {
	const id = generateRandomString();
	await db.execute(`
		INSERT INTO tasks (id, status, info, expire_time)
		VALUES (?, 0, 'Your task is in the queue.', DATE_ADD(NOW(), INTERVAL 7 DAY))
		ON DUPLICATE KEY UPDATE status = 0
	`, [id]);
	return id;
}

export async function updateTask(id, status, info = "") {
	await db.execute(`
		UPDATE tasks
		SET status = ?, info = ?
		WHERE id = ?
	`, [status, info, id]);
}