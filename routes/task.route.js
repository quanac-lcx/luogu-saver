import express from 'express';
import { getTaskById } from '../services/task.service.js';

const router = express.Router();

router.get('/query', async (req, res) => {
	try {
		const id = req.query.id;
		if (!id) throw new Error("Task ID is required.");
		const task = await getTaskById(id);
		if (!task) throw new Error('Task not found.');
		res.json(utils.makeResponse(true, { tasks: [task] }));
	} catch (error) {
		logger.warn(`An error occurred while fetching tasks: ${error.message}`);
		res.json(utils.makeResponse(false, { message: error.message || "Failed to fetch tasks." }));
	}
});

router.get('/:id', async (req, res, next) => {
	try {
		const taskId = req.params.id;
		const task = await getTaskById(taskId);
		if (!task) throw new Error('Task not found.');
		task.position = worker.getQueuePosition(task.id);
		res.render('system/task.njk', { title: "任务详情", task });
	} catch (error) {
		logger.warn(`An error occurred while fetching task details: ${error.message}`);
		next(error);
	}
});

export default router;