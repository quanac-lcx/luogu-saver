import express from 'express';
import config from "../config.js";
import { getArticleById, getRecentArticles } from "../services/article.service.js";

const router = express.Router();

router.get('/recent', async (req, res, next) => {
	try {
		const count = Math.min(parseInt(req.query.count) || config.recent.article.default, config.recent.article.max);
		let articles = await getRecentArticles(count, req);
		res.render('article_recent.njk', { title: "最近更新", articles });
	} catch (error) {
		next(error);
	}
});

router.get('/save/:id', async (req, res) => {
	try {
		const s = req.params.id;
		if (s.length !== 8) throw new Error('Invalid article ID.');
		const url = `https://www.luogu.com/article/${s}`;
		const id = await worker.pushTaskToQueue({ url, aid: s, type: 0 });
		res.send(utils.makeResponse(true, { message: "Request queued.", result: id }));
	} catch (error) {
		logger.warn('An error occurred when saving article: ' + error.message);
		res.send(utils.makeResponse(false, { message: error.message }));
	}
});

router.get('/:id', async (req, res, next) => {
	try {
		const { id } = req.params;
		const result = await getArticleById(id, req);
		
		if (!result) {
			res.render('article.njk', {
				title: `保存文章`,
				article: { title: `文章 ${id}`, id, updated_at: "尚未保存" },
				renderedContent: null,
				empty: true
			});
			return;
		}
		
		const { article, renderedContent } = result;
		res.render('article.njk', {
			title: article.title,
			article,
			renderedContent,
			empty: false
		});
	} catch (error) {
		next(error);
	}
});

export default router;