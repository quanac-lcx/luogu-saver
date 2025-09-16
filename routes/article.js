import express from 'express';
import User from '../models/user.js';
import Article from "../models/article.js";

const router = express.Router();

router.get('/recent', async (req, res, next) => {
	try {
		const count = Math.min(parseInt(req.query.count) || 20, 2000);
		let articles = await Article.find({
			where: { deleted: false },
			order: { priority: 'DESC', updated_at: 'DESC' },
			take: count
		});
		articles = await Promise.all(articles.map(async(article) => {
			await article.loadRelationships();
			article.formatDate();
			article.summary = article.content.slice(0, 200);
			article.tags = JSON.parse(article.tags);
			return article;
		}));
		res.render('article_recent.njk', { title: "最近更新", articles });
	} catch (error) {
		next(error);
	}
});

router.get('/:id', async (req, res, next) => {
	try {
		const { id } = req.params;
		if (id.length !== 8) throw new Error('Invalid article ID.');
		const start = Date.now();
		const article = await Article.findById(id);
		if (!article) {
			res.render('article.njk', {
				title: "保存文章",
				article: {
					title: `文章 - ${id}`,
					id,
					updated_at: "尚未保存"
				},
				renderedContent: null,
				empty: true
			});
			return;
		}
		await article.loadRelationships();
		article.formatDate();
		if (article.deleted) {
			throw new Error(article.deleted_reason);
		}
		const endLoading = Date.now();
		logger.debug(`Article ${article.id} loaded from database in ${endLoading - start}ms.`);
		const sanitized = utils.sanitizeLatex(article.content);
		const renderedContent = renderer.createMarkdownRenderer().renderMarkdown(sanitized);
		const endRendering = Date.now();
		logger.debug(`Article ${article.id} loaded in ${endRendering - start}ms.`);
		res.render('article.njk', { title: `${article.title}`, article, renderedContent, empty: false });
	} catch (error) {
		next(error);
	}
});

router.get('/save/:id', async (req, res) => {
	try {
		const s = req.params.id;
		if (s.length !== 8) throw new Error('Invalid article ID.');
		const url = `https://www.luogu.com/article/${s}`;
		const id = await worker.pushQueue({ url, aid: s, type: 0 });
		res.send(utils.makeResponse(true, { message: "Request queued.", result: id }));
	} catch (error) {
		logger.warn('An error occurred when saving article: ' + error.message);
		res.send(utils.makeResponse(false, { message: error.message }));
	}
});

export default router;