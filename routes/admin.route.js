import express from 'express';
import { requireAdmin } from "../middleware/permission.js";
import { makeResponse } from "../core/utils.js";
import { asyncHandler } from "../core/errors.js";
import * as adminService from "../services/admin.service.js";
import * as adminWorker from "../workers/admin.worker.js";

const router = express.Router();

// Admin dashboard page
router.get('/', requireAdmin, asyncHandler(async (req, res, next) => {
	const stats = await adminService.getDashboardStats();
	res.render('admin/dashboard.njk', { 
		title: "管理后台", 
		stats
	});
}));

// Error logs management
router.get('/errors', requireAdmin, asyncHandler(async (req, res, next) => {
	const page = parseInt(req.query.page) || 1;
	const level = req.query.level || '';
	const result = await adminService.getErrorLogs(page, 50, level);
	
	res.render('admin/errors.njk', {
		title: "错误日志",
		...result
	});
}));

// Queue management
router.get('/queue', requireAdmin, asyncHandler(async (req, res, next) => {
	const queueStatus = await adminService.getQueueStatus();
	res.render('admin/queue.njk', {
		title: "队列管理",
		queueStatus
	});
}));

// Soft delete management
router.get('/deletions', requireAdmin, asyncHandler(async (req, res, next) => {
	const type = req.query.type || 'article';
	const status = req.query.status || 'deleted'; // 'deleted' or 'undeleted'
	const page = parseInt(req.query.page) || 1;
	const search = req.query.search || '';
	
	let result;
	if (status === 'undeleted') {
		result = await adminService.getUndeletedItems(type, page, 20, search);
	} else {
		result = await adminService.getDeletedItems(type, page, 20, search);
	}
	
	res.render('admin/deletions.njk', {
		title: "删除管理",
		...result,
		status
	});
}));

// Token management
router.get('/tokens', requireAdmin, asyncHandler(async (req, res, next) => {
	const page = parseInt(req.query.page) || 1;
	const search = req.query.search || '';
	const result = await adminService.getTokens(page, 30, search);

	res.render('admin/tokens.njk', {
		title: "Token 管理",
		...result
	});
}));

// API Routes
router.post('/api/jobs/cleanup', requireAdmin, asyncHandler(async (req, res, next) => {
	const result = await adminWorker.executeCleanupJob();
	res.json(makeResponse(true, result));
}));

router.post('/api/jobs/update-problems', requireAdmin, asyncHandler(async (req, res, next) => {
	const result = await adminWorker.executeUpdateProblemsJob();
	res.json(makeResponse(true, result));
}));

router.post('/api/restore/:type/:id', requireAdmin, asyncHandler(async (req, res, next) => {
	const { type, id } = req.params;
	const result = await adminService.restoreItem(type, id);
	res.json(makeResponse(true, result));
}));

router.delete('/api/delete/:type/:id', requireAdmin, asyncHandler(async (req, res, next) => {
	const { type, id } = req.params;
	const result = await adminService.deleteItem(type, id);
	res.json(makeResponse(true, result));
}));

router.delete('/api/tokens/:id', requireAdmin, asyncHandler(async (req, res, next) => {
	const result = await adminService.deleteToken(req.params.id);
	res.json(makeResponse(true, result));
}));

router.get('/api/queue/status', requireAdmin, asyncHandler(async (req, res, next) => {
	const queueStatus = await adminService.getQueueStatus();
	res.json(makeResponse(true, { queueStatus }));
}));

router.get('/api/accounts', requireAdmin, asyncHandler(async (req, res, next) => {
	const accounts = await adminService.getAccountsConfig();
	res.json(makeResponse(true, { accounts }));
}));

router.post('/api/accounts', requireAdmin, asyncHandler(async (req, res, next) => {
	const { accounts } = req.body;
	const result = await adminService.updateAccountsConfig(accounts);
	res.json(makeResponse(true, result));
}));

router.post('/api/restart', requireAdmin, asyncHandler(async (req, res, next) => {
	const result = await adminWorker.restartService();
	res.json(makeResponse(result.success, { message: result.message }));
}));

// Mass deletion endpoints
router.post('/api/mass-delete/articles', requireAdmin, asyncHandler(async (req, res, next) => {
	const { reason } = req.body;
	const result = await adminService.markAllArticlesDeleted(reason);
	res.json(makeResponse(true, result));
}));

router.post('/api/mass-delete/pastes', requireAdmin, asyncHandler(async (req, res, next) => {
	const { reason } = req.body;
	const result = await adminService.markAllPastesDeleted(reason);
	res.json(makeResponse(true, result));
}));

// Mark single item as deleted
router.post('/api/mark-deleted/:type/:id', requireAdmin, asyncHandler(async (req, res, next) => {
	const { type, id } = req.params;
	const { reason } = req.body;
	const result = await adminService.markItemDeleted(type, id, reason);
	res.json(makeResponse(true, result));
}));

export default router;