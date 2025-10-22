import express from 'express';
import RSS from 'rss';
import config from "../config.js";
import { getArticleById, getRecentArticles, getRecentArticlesByHours } from "../services/article.service.js";
import { ValidationError, asyncHandler, asyncJsonHandler, logError } from "../core/errors.js";
import { makeResponse } from "../core/utils.js";

const router = express.Router();

router.get('/recent', asyncHandler(async (req, res, next) => {
	const count = Math.min(parseInt(req.query.count) || config.recent.article.default, config.recent.article.max);
	let articles = await getRecentArticles(count);
	res.render('content/article_recent.njk', { title: "最近更新", articles });
}));

router.get('/rss', asyncHandler(async (req, res, next) => {
	try {
		const hours = config.rss?.article?.recentHours || 24;
		const articles = await getRecentArticlesByHours(hours);
		
		const feed = new RSS({
			title: '洛谷文章更新',
			description: `最近 ${hours} 小时更新的文章`,
			feed_url: `${req.protocol}://${req.get('host')}/article/rss`,
			site_url: `${req.protocol}://${req.get('host')}`,
			language: 'zh-CN'
		});
		
		for (const article of articles) {
			feed.item({
				title: article.title,
				description: article.content ? article.content.substring(0, 500) : '',
				url: `${req.protocol}://${req.get('host')}/article/${article.id}`,
				author: article.author?.name || '未知作者',
				date: article.updated_at
			});
		}
		
		res.set('Content-Type', 'application/rss+xml; charset=UTF-8');
		res.send(feed.xml());
	} catch (error) {
		await logError(error, req);
		throw error;
	}
}));

router.get('/save/:id', asyncJsonHandler(async (req, res) => {
	const s = req.params.id;
	if (s.length !== 8) throw new ValidationError("文章 ID 无效");
	const url = `https://www.luogu.com/article/${s}`;
	const id = await worker.pushTaskToQueue({ url, aid: s, type: 0 });
	res.send(makeResponse(true, { message: "请求已入队", result: id }));
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