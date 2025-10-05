import express from 'express';
import { getRecentJudgements } from "../services/judgement.service.js";
import { ValidationError, asyncHandler, asyncJsonHandler } from "../core/errors.js";
import { fetchContent } from "../core/request.js";
import { pushTaskToQueue } from '../workers/index.worker.js';
import { makeResponse } from '../core/utils.js';

const router = express.Router();

router.get('/save', asyncJsonHandler(async (req, res) => {
	const url = `https://www.luogu.com.cn/judgement`;
		const id = await pushTaskToQueue({ url, aid: '-', type: 3 });
	res.send(makeResponse(true, { message: "请求已入队", result: id }));
}));

// Debug endpoint to view raw HTML
router.get('/debug', asyncHandler(async (req, res) => {
	try {
		const url = `https://www.luogu.com.cn/judgement`;
		const { resp } = await fetchContent(url, {}, { c3vk: "new" });
		
		const htmlData = resp?.data || '';
		const length = htmlData ? (typeof htmlData === 'string' ? htmlData.length : JSON.stringify(htmlData).length) : 0;
		
		// Return the raw HTML with syntax highlighting
		res.setHeader('Content-Type', 'text/html; charset=utf-8');
		res.send(`
<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8">
	<title>陶片放逐调试</title>
	<style>
		body {
			font-family: monospace;
			margin: 20px;
			background-color: #f5f5f5;
		}
		.container {
			background: white;
			padding: 20px;
			border-radius: 5px;
			box-shadow: 0 2px 4px rgba(0,0,0,0.1);
		}
		h1 {
			color: #333;
		}
		pre {
			background: #272822;
			color: #f8f8f2;
			padding: 15px;
			border-radius: 5px;
			overflow-x: auto;
			white-space: pre-wrap;
			word-wrap: break-word;
		}
		.info {
			background: #e3f2fd;
			padding: 10px;
			border-radius: 5px;
			margin-bottom: 15px;
		}
		.error {
			background: #ffebee;
			color: #c62828;
			padding: 10px;
			border-radius: 5px;
			margin-bottom: 15px;
		}
		.msg {
			background: #0aa216ff;
			color: #000000ff;
			padding: 10px;
			border-radius: 5px;
			margin-bottom: 15px;
		}
	</style>
</head>
<body>
	<div class="container">
		<h1>洛谷保存站-陶片放逐调试</h1>
		<div class="info">
			<strong>URL:</strong> ${url};<br>
			<strong>状态码:</strong> ${resp.status || 'N/A'}；<br>
			<strong>内容类型:</strong> ${typeof htmlData}；<br>
			<strong>内容长度:</strong> ${length} 字符。
		</div>
		<div class="msg">
			保存站会在用户点击保存按钮时，抓取洛谷陶片放逐页面的 HTML 代码，解析页面中的 JSON 数据，提取 logs 记录，最后保存到数据库并调取数据库内容渲染。<br />
			如果有爬取失败现象，请检查下方代码能否正常显示 ↓
		</div>
		</div>
		<h2>响应头：</h2>
		<pre>${JSON.stringify(resp.headers, null, 2)}</pre>
		<h2>源代码：</h2>
		<pre>${typeof htmlData === 'string' ? htmlData.replace(/</g, '&lt;').replace(/>/g, '&gt;') : JSON.stringify(htmlData, null, 2)}</pre>
	</div>
</body>
</html>
		`);
	} catch (err) {
		res.status(500).send(`<h1>错误</h1><pre>${err.message}\n${err.stack}</pre>`);
	}
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
