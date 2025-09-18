import express from 'express';
import nunjucks from 'nunjucks';
import cookieParser from 'cookie-parser';
// import {filterIPs} from './middleware/rate_limit.js';
import 'dotenv/config';
import logger from './logger.js';

import articleRouter from './routes/article.js';
import pasteRouter from './routes/paste.js';
import taskRouter from './routes/task.js';
import tokenRouter from './routes/token.js';
import userRouter from './routes/user.js';
import apiRouter from './routes/api.js';
import indexRouter from './routes/index.js';
import problemRouter from './routes/problem.js';
import * as worker from "./worker.js";
import * as renderer from "./renderer.js";
import auth from "./middleware/auth.js";
import {scheduleJob} from "node-schedule";
import * as utils from "./utils.js";

const app = express();
const port = process.env.PORT || 55086;
nunjucks.configure("views", { autoescape: true, express: app, watch: true });

// initialize routes and middleware

app.use(cookieParser());
app.set('trust proxy', true);
app.use('/static', express.static('static'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
	req.realIP = req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || req.ip;
	next();
});
// app.use(filterIPs);
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
app.use('/problem', problemRouter);

app.use((err, req, res, next) => {
	logger.warn(`An error occurred while processing ${req.method} ${req.originalUrl}: ${err.message}`);
	res.render('error.njk', { title: "错误", error_message: err.message });
});

// make some modules globally accessible

global.utils = utils;
global.logger = logger;
global.worker = worker;
global.renderer = renderer;

// start worker

worker.requestPointTick();
worker.processQueue();

app.use((req, res, next) => {
    res.status(404).render('404.njk', {
        title: "404喵~",
        originalUrl: req.originalUrl
    });
});
// initialize database

import "reflect-metadata";
import { DataSource } from "typeorm";
import config from "./ormconfig.json" with { type: "json" };
import { loadEntities } from "./entities/index.js";
import Task from "./models/task.js";
import {runProblemUpdater} from "./worker.js";

export const AppDataSource = new DataSource({
	...config,
	host: process.env.DB_HOST || config.host,
	port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : config.port,
	username: process.env.DB_USER || config.username,
	password: process.env.DB_PASSWORD || config.password,
	database: process.env.DB_NAME || config.database,
	entities: loadEntities()
});

if (import.meta.url.endsWith('app.js')) {
	AppDataSource.initialize()
		.then(() => {
			scheduleJob('0 * * * *', async () => {
				try {
					await Task.deleteExpired();
				} catch (error) {
					logger.warn("An error occurred while cleaning up expired tasks: " + error.message);
				}
			})
			scheduleJob('0 2 * * *', async () => {
				await runProblemUpdater();
			})
		})
		.then(() => worker.restoreQueue())
		.then(() => {
			app.listen(port, () => {
				logger.info("Server is running on port " + port);
			})
		});
}
else {
	logger.info("app.js imported as a module, skipping initialization logic.");
}
