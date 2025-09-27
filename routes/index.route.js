import express from "express";
import { getCounts } from "../services/statistic.service.js";

const router = express.Router();

router.get('/', async (req, res) => {
	const { articlesCount, pastesCount } = await getCounts(req);
	res.render('index.njk', { title: "首页", paste_count: pastesCount, article_count: articlesCount });
});

router.get('/search', (req, res) => {
	res.render('search.njk', { title: "搜索" });
});

router.get('/privacy', (req, res) => {
	res.render('privacy.njk', { title: "隐私协议" });
});

router.get('/disclaimer', (req, res) => {
	res.render('disclaimer.njk', { title: "免责声明" });
});

router.get('/deletion', (req, res) => {
	res.render('deletion.njk', { title: "数据移除政策" });
});

router.get('/statistic', (req, res) => {
	res.render('statistic.njk', { title: "统计" });
});

export default router;