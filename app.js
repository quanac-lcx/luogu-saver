import express from 'express';
import nunjucks from 'nunjucks';
import { filterIPs } from './middleware/rate_limit.js';
import 'dotenv/config';

const app = express();
const port = process.env.PORT || 55086;
import logger from './logger.js';

import articleRouter from './routes/article.js';
import pasteRouter from './routes/paste.js';
nunjucks.configure("views", { autoescape: true, express: app, watch: true });

app.set('trust proxy', true);
app.use('/static', express.static('static'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(filterIPs);

app.use((req, res, next) => {
	logger.info(`${req.ip} ${req.method} ${req.originalUrl} ${(!req.body || JSON.stringify(req.body) === '{}') ? '' : JSON.stringify(req.body)}`);
	next();
});

app.get('/', (req, res) => {
	res.render('index.njk', { title: "首页", paste_count: 35289, article_count: 63294 });
});

app.get('/search', (req, res) => {
	res.render('search.njk', { title: "搜索" });
});

app.get('/privacy', (req, res) => {
	res.render('privacy.njk', { title: "隐私协议" });
});

app.get('/disclaimer', (req, res) => {
	res.render('disclaimer.njk', { title: "免责声明" });
});

app.get('/deletion', (req, res) => {
	res.render('deletion.njk', { title: "数据移除政策" });
});

app.use('/article', articleRouter);
app.use('/paste', pasteRouter);

app.use((err, req, res, next) => {
	logger.error(err.message);
	res.status(500).render('error.njk', { title: "错误", error_message: err.message });
});

app.listen(port, () => {
	logger.info("Server is running on port " + port);
})