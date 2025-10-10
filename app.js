import express from 'express';
import nunjucks from 'nunjucks';
import cookieParser from 'cookie-parser';
import { scheduleJob } from "node-schedule";
import "reflect-metadata";
import { DataSource } from "typeorm";

import articleRouter from './routes/article.route.js';
import pasteRouter from './routes/paste.route.js';
import taskRouter from './routes/task.route.js';
import tokenRouter from './routes/token.route.js';
import userRouter from './routes/user.route.js';
import apiRouter from './routes/api.route.js';
import indexRouter from './routes/index.route.js';
import problemRouter from './routes/problem.route.js';
import benbenRouter from './routes/benben.route.js';
import adminRouter from './routes/admin.route.js';
import judgementRouter from './routes/judgement.route.js';

import * as renderer from "./core/markdown.js";
import * as utils from "./core/utils.js";
import logger from './core/logger.js';
import RedisManager from './core/redis.js';

import ormConfig from "./ormconfig.json" with { type: "json" };
import config from './config.js';

import { loadEntities } from "./entities/index.js";

import cleanup from './jobs/cleanup.js';
import updateProblems from './jobs/update_problems.js';

import auth from "./middleware/auth.js";
import logging from "./middleware/logging.js";
import notFound from "./middleware/not_found.js";
import errorDisplay from "./middleware/error_display.js";
import getIP from "./middleware/get_ip.js";
import cacheContextMiddleware from "./middleware/cache_context.js";
import mobileDetect from "./middleware/mobile_detect.js";

import * as worker from "./workers/index.worker.js";
import { warmUpBenbenStatistics } from "./jobs/warm_up.js";
import { startWebSocketWorker } from "./workers/websocket.worker.js";

const app = express();
const port = config.port;
const nunjucksEnv = nunjucks.configure("views", { autoescape: true, express: app, watch: true });

// Add custom Nunjucks filters

nunjucksEnv.addFilter('getPermissionNames', (permission) => {
	return utils.getPermissionNames(permission);
});

nunjucksEnv.addFilter('formatDate', (date) => {
	if (!date) return '';
	// 支持字符串、Date对象
	const dateObj = (date instanceof Date) ? date : new Date(date);
	return utils.formatDate(dateObj);
});

app.use(cookieParser());
app.set('trust proxy', true);
app.use('/static', express.static('static'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(getIP);
app.use(logging);
app.use(cacheContextMiddleware);
app.use(mobileDetect);
app.use(auth);

app.use('/', indexRouter);
app.use('/article', articleRouter);
app.use('/paste', pasteRouter);
app.use('/task', taskRouter);
app.use('/token', tokenRouter);
app.use('/user', userRouter);
app.use('/api', apiRouter);
app.use('/problem', problemRouter);
app.use('/benben', benbenRouter);
app.use('/admin', adminRouter);
app.use('/judgement', judgementRouter);

app.use(notFound);
app.use(errorDisplay);

global.logger = logger;
global.renderer = renderer.createMarkdownRenderer();
global.worker = worker;
global.redis = new RedisManager({
	host: config.redis.host,
	port: config.redis.port,
	password: config.redis.password,
	db: config.redis.db
});
global.listener = startWebSocketWorker();

worker.startWorker();

export const AppDataSource = new DataSource({
	...ormConfig,
	host: config.database.host,
	port: config.database.port,
	username: config.database.user,
	password: config.database.password,
	database: config.database.database,
	entities: loadEntities()
});

if (!import.meta.url.endsWith('app.js')) {
	logger.info("app.js 以 import 方式导入，跳过初始化");
}
else {
	AppDataSource.initialize()
		.then(() => {
			scheduleJob('0/10 * * * *', cleanup);
			scheduleJob('0 0 * * *', updateProblems);
			scheduleJob('0/5 * * * *', warmUpBenbenStatistics);
		})
		.then(() => worker.restoreQueue())
		.then(() => {
			app.listen(port, () => {
				logger.info("服务器监听端口: " + port);
			})
		});
}