import express from 'express';
import Task from "../models/task.js";

const router = express.Router();

const statusMap = {
	0: 'Pending',
	1: 'Processing',
	2: 'Completed',
	3: 'Failed',
};

router.get('/query', async (req, res) => {
	try {
		const id = req.query.id;
		if (!id) {
			throw new Error("Task ID is required.");
		}
		else {
			const task = await Task.findById(id);
			if (!task) throw new Error('Task not found.');
			task.formatDate();
			task.status = statusMap[task.status] || 'Unknown';
			task.position = worker.getQueuePosition(task.id);
			res.json(utils.makeResponse(true, { tasks: [task] }));
		}
	} catch (error) {
		logger.warn(`An error occurred while fetching tasks: ${error.message}`);
		res.json(utils.makeResponse(false, { message: error.message || "Failed to fetch tasks." }));
	}
});

router.get('/:id', async (req, res, next) => {
	try {
		const taskId = req.params.id;
		const task = await Task.findById(taskId);
		if (!task) throw new Error('Task not found.');
		task.formatDate();
		task.status = statusMap[task.status] || 'Unknown';
		task.position = worker.getQueuePosition(task.id);
		res.render('task.njk', {title: "任务详情", task});
	} catch (error) {
		logger.warn(`An error occurred while fetching task details: ${error.message}`);
		next(error);
	}
});

export default router;