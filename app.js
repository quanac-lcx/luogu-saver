import express from 'express';
import nunjucks from 'nunjucks';
import cookieParser from 'cookie-parser';
import {filterIPs} from './middleware/rate_limit.js';
import 'dotenv/config';
import logger from './logger.js';

import articleRouter from './routes/article.js';
import pasteRouter from './routes/paste.js';
import taskRouter from './routes/task.js';
import tokenRouter from './routes/token.js';
import userRouter from './routes/user.js';
import apiRouter from './routes/api.js';
import indexRouter from './routes/index.js';
import * as worker from "./worker.js";
import * as renderer from "./renderer.js";
import db from "./db.js";
import auth from "./middleware/auth.js";
import {scheduleJob} from "node-schedule";
import fs from "fs/promises";
import path from "path";
import axios from "axios";
import * as utils from "./utils.js";

const app = express();
const port = process.env.PORT || 55086;
nunjucks.configure("views", { autoescape: true, express: app, watch: true });

app.use(cookieParser());
app.set('trust proxy', true);
app.use('/static', express.static('static'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
	req.realIP = req.headers['ali-cdn-real-ip'] || req.ip;
	next();
});
app.use(filterIPs);
app.use(auth);
app.use((req, res, next) => { res.locals.user = req.user; next(); });

app.use((req, res, next) => {
	logger.info(`${req.realIP} ${req.user?.id ? `(uid: ${req.user.id}) ` : ''}${req.method} ${req.originalUrl} ${(!req.body || JSON.stringify(req.body) === '{}') ? '' : JSON.stringify(req.body)}`);
	next();
});

app.use('/', indexRouter);
app.use('/article', articleRouter);
app.use('/paste', pasteRouter);
app.use('/task', taskRouter);
app.use('/token', tokenRouter);
app.use('/user', userRouter);
app.use('/api', apiRouter);

app.use((err, req, res, next) => {
	logger.warn(`An error occurred while processing ${req.method} ${req.originalUrl}: ${err.message}`);
	res.render('error.njk', { title: "错误", error_message: err.message });
});

global.utils = utils;
global.logger = logger;
global.db = db;
global.worker = worker;
global.renderer = renderer;

worker.requestPointTick();
worker.processQueue();

async function updateBeacon() {
	const url = "https://static.cloudflareinsights.com/beacon.min.js";
	const dest = path.join(process.cwd(), "static", "cloudflare", "beacon.min.js");
	logger.debug("Updating beacon.min.js from " + url);
	try {
		const startTime = Date.now();
		const response = await axios.get(url, { responseType: "text" });
		await fs.mkdir(path.dirname(dest), { recursive: true });
		await fs.writeFile(dest, response.data, "utf-8");
		const endTime = Date.now();
		logger.debug(`beacon.min.js updated in ${(endTime - startTime)} ms`);
		logger.info("Updated beacon.min.js successfully");
	} catch (err) {
		logger.warn("Beacon update failed: " + err.message);
	}
}

updateBeacon().then(() => {
	logger.info("Initial beacon.min.js update completed");
}).catch((err) => {
	logger.warn("Initial beacon.min.js update failed: " + err.message);
});

scheduleJob('0 * * * *', updateBeacon);

scheduleJob('0 * * * *', async () => {
	try {
		await db.execute("DELETE FROM tasks WHERE expire_time <= NOW()");
	} catch (error) {
		logger.warn("An error occurred while cleaning up expired tasks: " + error.message);
	}
})

worker.restoreQueue().then(() => {
	app.listen(port, () => {
		logger.info("Server is running on port " + port);
	})
});