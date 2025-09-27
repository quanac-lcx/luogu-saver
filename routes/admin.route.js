import express from 'express';
import { requireAdmin } from "../middleware/permission.js";
import cleanup from "../jobs/cleanup.js";
import { updateAllProblemSets } from "../services/problem.service.js";
import { makeResponse } from "../core/utils.js";
import ErrorLog from "../models/error_log.js";
import Article from "../models/article.js";
import Paste from "../models/paste.js";
import Token from "../models/token.js";
import * as queue from "../workers/queue.worker.js";
import { exec } from "child_process";
import { promisify } from "util";

const router = express.Router();
const execAsync = promisify(exec);

// Admin dashboard page
router.get('/', requireAdmin, async (req, res, next) => {
	try {
		// Get summary statistics
		const stats = {
			errors: {
				total: await ErrorLog.count(),
				recent: await ErrorLog.count({
					where: {
						created_at: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
					}
				})
			},
			queue: {
				length: queue.getQueueLength(),
				running: queue.getRunning()
			},
			articles: {
				total: await Article.count(),
				deleted: await Article.count({ where: { deleted: true } })
			},
			pastes: {
				total: await Paste.count(),
				deleted: await Paste.count({ where: { deleted: true } })
			},
			tokens: await Token.count()
		};

		res.render('admin/dashboard.njk', { 
			title: "管理后台", 
			stats,
			user: req.user 
		});
	} catch (error) {
		next(error);
	}
});

// Error logs management
router.get('/errors', requireAdmin, async (req, res, next) => {
	try {
		const page = parseInt(req.query.page) || 1;
		const limit = 50;
		const offset = (page - 1) * limit;
		const level = req.query.level || '';

		const whereCondition = level ? { level } : {};
		
		const errors = await ErrorLog.find({
			where: whereCondition,
			order: { created_at: "DESC" },
			skip: offset,
			take: limit
		});

		// Load user relationships
		for (const error of errors) {
			await error.loadRelationships();
		}

		const totalCount = await ErrorLog.count({ where: whereCondition });
		const totalPages = Math.ceil(totalCount / limit);

		res.render('admin/errors.njk', {
			title: "错误日志",
			errors,
			currentPage: page,
			totalPages,
			level,
			user: req.user
		});
	} catch (error) {
		next(error);
	}
});

// Queue management
router.get('/queue', requireAdmin, (req, res, next) => {
	try {
		const queueStatus = {
			length: queue.getQueueLength(),
			running: queue.getRunning()
		};

		res.render('admin/queue.njk', {
			title: "队列管理",
			queueStatus,
			user: req.user
		});
	} catch (error) {
		next(error);
	}
});

// Soft delete management
router.get('/deletions', requireAdmin, async (req, res, next) => {
	try {
		const type = req.query.type || 'article';
		const page = parseInt(req.query.page) || 1;
		const limit = 20;
		const offset = (page - 1) * limit;

		let items = [];
		let totalCount = 0;

		if (type === 'article') {
			items = await Article.find({
				where: { deleted: true },
				order: { updated_at: "DESC" },
				skip: offset,
				take: limit
			});
			totalCount = await Article.count({ where: { deleted: true } });
		} else if (type === 'paste') {
			items = await Paste.find({
				where: { deleted: true },
				order: { updated_at: "DESC" },
				skip: offset,
				take: limit
			});
			totalCount = await Paste.count({ where: { deleted: true } });

			// Load relationships for pastes
			for (const paste of items) {
				await paste.loadRelationships();
			}
		}

		const totalPages = Math.ceil(totalCount / limit);

		res.render('admin/deletions.njk', {
			title: "删除管理",
			items,
			type,
			currentPage: page,
			totalPages,
			user: req.user
		});
	} catch (error) {
		next(error);
	}
});

// Token management
router.get('/tokens', requireAdmin, async (req, res, next) => {
	try {
		const page = parseInt(req.query.page) || 1;
		const limit = 20;
		const offset = (page - 1) * limit;

		const tokens = await Token.find({
			order: { created_at: "DESC" },
			skip: offset,
			take: limit
		});

		const totalCount = await Token.count();
		const totalPages = Math.ceil(totalCount / limit);

		res.render('admin/tokens.njk', {
			title: "Token 管理",
			tokens,
			currentPage: page,
			totalPages,
			user: req.user
		});
	} catch (error) {
		next(error);
	}
});

// API Routes
router.post('/api/jobs/cleanup', requireAdmin, async (req, res, next) => {
	try {
		logger.debug("Admin triggered cleanup job.");
		cleanup();
		res.json(makeResponse(true, "清理任务已启动"));
	} catch (error) {
		res.json(makeResponse(false, error.message));
	}
});

router.post('/api/jobs/update-problems', requireAdmin, async (req, res, next) => {
	try {
		logger.debug("Admin triggered update problems job.");
		updateAllProblemSets();
		res.json(makeResponse(true, "题目更新任务已启动"));
	} catch (error) {
		res.json(makeResponse(false, error.message));
	}
});

router.post('/api/restore/:type/:id', requireAdmin, async (req, res, next) => {
	try {
		const { type, id } = req.params;
		
		if (type === 'article') {
			const article = await Article.findById(id);
			if (!article) {
				return res.json(makeResponse(false, "专栏不存在"));
			}
			article.deleted = false;
			article.deleted_reason = null;
			await article.save();
		} else if (type === 'paste') {
			const paste = await Paste.findById(id);
			if (!paste) {
				return res.json(makeResponse(false, "剪贴板不存在"));
			}
			paste.deleted = false;
			paste.deleted_reason = null;
			await paste.save();
		} else {
			return res.json(makeResponse(false, "不支持的类型"));
		}

		res.json(makeResponse(true, "恢复成功"));
	} catch (error) {
		res.json(makeResponse(false, error.message));
	}
});

router.delete('/api/tokens/:id', requireAdmin, async (req, res, next) => {
	try {
		const token = await Token.findById(req.params.id);
		if (!token) {
			return res.json(makeResponse(false, "Token 不存在"));
		}
		
		await token.remove();
		res.json(makeResponse(true, "Token 删除成功"));
	} catch (error) {
		res.json(makeResponse(false, error.message));
	}
});

router.post('/api/restart', requireAdmin, async (req, res, next) => {
	try {
		// Try PM2 first
		try {
			await execAsync('pm2 restart luogu-saver || pm2 restart all');
			return res.json(makeResponse(true, "PM2 重启命令已执行"));
		} catch (pm2Error) {
			logger.debug("PM2 restart failed, trying systemctl");
		}

		// Fallback to systemctl
		try {
			await execAsync('systemctl restart luogu-saver');
			return res.json(makeResponse(true, "systemctl 重启命令已执行"));
		} catch (systemctlError) {
			logger.debug("systemctl restart failed");
		}

		// If both fail, suggest manual restart
		res.json(makeResponse(false, "无法自动重启，请手动重启服务"));
	} catch (error) {
		res.json(makeResponse(false, error.message));
	}
});

export default router;