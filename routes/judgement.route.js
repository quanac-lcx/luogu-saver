import express from 'express';
import { getRecentJudgements } from "../services/judgement.service.js";
import { ValidationError, asyncHandler, asyncJsonHandler } from "../core/errors.js";

const router = express.Router();

router.get('/save', asyncJsonHandler(async (req, res) => {
	const url = `https://www.luogu.com.cn/judgement`;
	const id = await worker.pushTaskToQueue({ url, aid: 'judgement', type: 2 });
	res.send(utils.makeResponse(true, { message: "请求已入队", result: id }));
}));

router.get('/', asyncHandler(async (req, res, next) => {
	const page = Math.max(1, parseInt(req.query.page) || 1);
	const perPage = Math.min(50, Math.max(1, parseInt(req.query.per_page) || 10));
	
	const { judgements, hasMore } = await getRecentJudgements(page, perPage);
	
	res.render('content/judgement.njk', {
		title: "陶片放逐",
		judgements,
		page,
		perPage,
		hasMore
	});
}));

export default router;
