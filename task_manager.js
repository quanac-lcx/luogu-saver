import Task from "./models/task.js";

export async function createTask(task) {
	const id = utils.generateRandomString();
	const newTask = Task.create({
		id,
		status: 0,
		info: 'Your task is in the queue.',
		expire_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
		oid: task.aid,
		type: task.type
	});
	await newTask.save();
	return id;
}

export async function updateTask(id, status, info = "") {
	const task = await Task.findById(id);
	task.status = status;
	task.info = info;
	await task.save();
}