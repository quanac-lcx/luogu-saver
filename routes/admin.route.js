import express from 'express';
import { requireAdmin } from "../middleware/permission.js";
import { makeResponse } from "../core/utils.js";
import * as adminService from "../services/admin.service.js";
import * as adminWorker from "../workers/admin.worker.js";

const router = express.Router();

// Admin dashboard page
router.get('/', requireAdmin, async (req, res, next) => {
	try {
		const stats = await adminService.getDashboardStats();
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
		const level = req.query.level || '';
		const result = await adminService.getErrorLogs(page, 50, level);
		
		res.render('admin/errors.njk', {
			title: "错误日志",
			...result,
			user: req.user
		});
	} catch (error) {
		next(error);
	}
});

// Queue management
router.get('/queue', requireAdmin, async (req, res, next) => {
	try {
		const queueStatus = await adminService.getQueueStatus();
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
		const result = await adminService.getDeletedItems(type, page);

		res.render('admin/deletions.njk', {
			title: "删除管理",
			...result,
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
		const result = await adminService.getTokens(page);

		res.render('admin/tokens.njk', {
			title: "Token 管理",
			...result,
			user: req.user
		});
	} catch (error) {
		next(error);
	}
});

// Accounts management
router.get('/accounts', requireAdmin, async (req, res, next) => {
	try {
		const accounts = await adminService.getAccountsConfig();
		res.render('admin/accounts.njk', {
			title: "账户管理",
			accounts,
			user: req.user
		});
	} catch (error) {
		next(error);
	}
});

// API Routes
router.post('/api/jobs/cleanup', requireAdmin, async (req, res, next) => {
	try {
		const result = await adminWorker.executeCleanupJob();
		res.json(makeResponse(true, result));
	} catch (error) {
		res.json(makeResponse(false, { message: error.message }));
	}
});

router.post('/api/jobs/update-problems', requireAdmin, async (req, res, next) => {
	try {
		const result = await adminWorker.executeUpdateProblemsJob();
		res.json(makeResponse(true, result));
	} catch (error) {
		res.json(makeResponse(false, { message: error.message }));
	}
});

router.post('/api/restore/:type/:id', requireAdmin, async (req, res, next) => {
	try {
		const { type, id } = req.params;
		const result = await adminService.restoreItem(type, id);
		res.json(makeResponse(true, result));
	} catch (error) {
		res.json(makeResponse(false, { message: error.message }));
	}
});

router.delete('/api/delete/:type/:id', requireAdmin, async (req, res, next) => {
	try {
		const { type, id } = req.params;
		const result = await adminService.deleteItem(type, id);
		res.json(makeResponse(true, result));
	} catch (error) {
		res.json(makeResponse(false, { message: error.message }));
	}
});

router.delete('/api/tokens/:id', requireAdmin, async (req, res, next) => {
	try {
		const result = await adminService.deleteToken(req.params.id);
		res.json(makeResponse(true, result));
	} catch (error) {
		res.json(makeResponse(false, { message: error.message }));
	}
});

router.get('/api/queue/status', requireAdmin, async (req, res, next) => {
	try {
		const queueStatus = await adminService.getQueueStatus();
		res.json(makeResponse(true, { queueStatus }));
	} catch (error) {
		res.json(makeResponse(false, { message: error.message }));
	}
});

router.get('/api/accounts', requireAdmin, async (req, res, next) => {
	try {
		const accounts = await adminService.getAccountsConfig();
		res.json(makeResponse(true, { accounts }));
	} catch (error) {
		res.json(makeResponse(false, { message: error.message }));
	}
});

router.post('/api/accounts', requireAdmin, async (req, res, next) => {
	try {
		const { accounts } = req.body;
		const result = await adminService.updateAccountsConfig(accounts);
		res.json(makeResponse(true, result));
	} catch (error) {
		res.json(makeResponse(false, { message: error.message }));
	}
});

router.post('/api/restart', requireAdmin, async (req, res, next) => {
	try {
		const result = await adminWorker.restartService();
		res.json(makeResponse(result.success, { message: result.message }));
	} catch (error) {
		res.json(makeResponse(false, { message: error.message }));
	}
});

export default router;