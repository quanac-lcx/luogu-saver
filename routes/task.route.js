import express from 'express';
import { getTaskById } from '../services/task.service.js';
import { ValidationError, NotFoundError, asyncHandler, asyncJsonHandler } from '../core/errors.js';

const router = express.Router();

router.get('/query', asyncJsonHandler(async (req, res) => {
	const id = req.query.id;
	if (!id) throw new ValidationError("任务 ID 不能为空");
	const task = await getTaskById(id);
	if (!task) throw new NotFoundError("任务未找到");
	res.json(utils.makeResponse(true, { tasks: [task] }));
}));

router.get('/:id', asyncHandler(async (req, res, next) => {
	const taskId = req.params.id;
	const task = await getTaskById(taskId);
	if (!task) throw new NotFoundError("任务未找到");
	task.position = worker.getQueuePosition(task.id);
	res.render('system/task.njk', { title: "任务详情", task });
}));

export default router;