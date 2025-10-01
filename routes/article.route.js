import express from 'express';
import config from "../config.js";
import { getArticleById, getRecentArticles } from "../services/article.service.js";
import { ValidationError, asyncHandler, asyncJsonHandler } from "../core/errors.js";

const router = express.Router();

router.get('/recent', asyncHandler(async (req, res, next) => {
	const count = Math.min(parseInt(req.query.count) || config.recent.article.default, config.recent.article.max);
	let articles = await getRecentArticles(count);
	res.render('content/article_recent.njk', { title: "最近更新", articles });
}));

router.get('/save/:id', asyncJsonHandler(async (req, res) => {
	const s = req.params.id;
	if (s.length !== 8) throw new ValidationError("文章 ID 无效");
	const url = `https://www.luogu.com/article/${s}`;
	const id = await worker.pushTaskToQueue({ url, aid: s, type: 0 });
	res.send(utils.makeResponse(true, { message: "Request queued.", result: id }));
}));

router.get('/:id', asyncHandler(async (req, res, next) => {
	const { id } = req.params;
	const result = await getArticleById(id);
	
	if (!result) {
		res.render('content/article.njk', {
			title: `保存文章`,
			article: { title: `文章 ${id}`, id, updated_at: "尚未保存" },
			renderedContent: null,
			empty: true
		});
		return;
	}
	
	const { article, renderedContent } = result;
	res.render('content/article.njk', {
		title: article.title,
		article,
		renderedContent,
		empty: false
	});
}));

export default router;