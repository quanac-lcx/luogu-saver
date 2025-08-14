const express = require('express');
const nunjucks = require('nunjucks');
const { filterIPs } = require('./middleware/rate_limit');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 55086;

const articleRouter = require('./routes/article');

nunjucks.configure("views", { autoescape: true, express: app, watch: true });

app.use('/static', express.static('static'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
	req.ip = (req.headers['x-forwarded-for'] || req.connection.remoteAddress || '').split(',')[0].trim();
	next();
});
app.use(filterIPs);

app.get('/', (req, res) => {
	res.render('index.njk', { title: "首页", paste_count: 35289, article_count: 63294 });
});

app.get('/search', (req, res) => {
	res.render('search.njk', { title: "搜索" });
});

app.use('/article', articleRouter);

app.listen(port, () => {
	console.log("Server started on port: " + port);
})