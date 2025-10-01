import express from 'express';
import { getTaskById } from '../services/task.service.js';
import { ValidationError, NotFoundError, logError } from '../core/errors.js';

const router = express.Router();

router.get('/query', async (req, res) => {
	try {
		const id = req.query.id;
		if (!id) throw new ValidationError("任务 ID 不能为空");
		const task = await getTaskById(id);
		if (!task) throw new NotFoundError("任务未找到");
		res.json(utils.makeResponse(true, { tasks: [task] }));
	} catch (error) {
		await logError(error, req, logger);
		res.json(utils.makeResponse(false, { message: error.message || "Failed to fetch tasks." }));
	}
});

router.get('/:id', async (req, res, next) => {
	try {
		const taskId = req.params.id;
		const task = await getTaskById(taskId);
		if (!task) throw new NotFoundError("任务未找到");
		task.position = worker.getQueuePosition(task.id);
		res.render('system/task.njk', { title: "任务详情", task });
	} catch (error) {
		await logError(error, req, logger);
		next(error);
	}
});

export default router;