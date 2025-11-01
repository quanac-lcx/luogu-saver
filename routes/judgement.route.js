import express from 'express';
import { getRecentJudgements } from "../services/judgement.service.js";
import { ValidationError, asyncHandler, asyncJsonHandler } from "../core/errors.js";
import { fetchContent } from "../core/request.js";
import { pushTaskToQueue } from '../workers/index.worker.js';
import { makeResponse } from '../core/utils.js';
import config from '../config.js';
const router = express.Router();

router.get('/save', asyncJsonHandler(async (req, res) => {
	const url = 'https://www.luogu.com.cn/judgement';
	const id = await pushTaskToQueue({ url, aid: Date.now(), type: 3 });
	res.send(makeResponse(true, { message: "请求已入队", result: id }));
}));

router.get('/', asyncHandler(async (req, res, next) => {
	const page = Math.max(1, parseInt(req.query.page) || 1);
	const perPage = Math.min(50, Math.max(1, parseInt(req.query.per_page) || 10));
	
	const result = await getRecentJudgements({ page, perPage });
	
	res.render('content/judgement.njk', {
		title: "陶片放逐",
		judgements: result.judgements,
		currentPage: result.currentPage,
		totalPages: result.totalPages,
		perPage: result.extra.perPage
	});
}));

export default router;
