import Task from "../models/task.js";

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
	
	// Invalidate cache when task is updated
	await global.redis.del(`task:${id}`);
}

export async function getWaitingTasks() {
	return await Task.createQueryBuilder("t").where("t.status = 0 OR t.status = 1").orderBy("t.id", "ASC").getMany();
}

const statusMap = {
	0: 'Pending',
	1: 'Processing',
	2: 'Completed',
	3: 'Failed',
};

export async function getTaskById(id) {
	const cacheKey = `task:${id}`;
	
	// Try to get from cache first
	const cachedResult = await global.redis.get(cacheKey);
	if (cachedResult) {
		return JSON.parse(cachedResult);
	}
	
	const task = await Task.findById(id);
	if (!task) return null;
	
	task.formatDate();
	task.status = statusMap[task.status] || 'Unknown';
	
	// Cache for 5 minutes (300 seconds) since task status can change
	await global.redis.set(cacheKey, JSON.stringify(task), 300);
	
	return task;
}