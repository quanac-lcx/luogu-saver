import express from 'express';
import { requireAdmin } from "../middleware/permission.js";
import { makeResponse } from "../core/utils.js";
import { asyncHandler, asyncJsonHandler } from "../core/errors.js";
import * as adminService from "../services/admin.service.js";
import * as adminWorker from "../workers/admin.worker.js";
import { invalidateCache } from "../core/cache.js";
import { updateTokenRole } from "../services/token.service.js";
import * as deletionRequestService from "../services/deletion_request.service.js";

const router = express.Router();

router.get('/', requireAdmin, asyncHandler(async (req, res, next) => {
	const stats = await adminService.getDashboardStats();
	res.render('admin/dashboard.njk', { 
		title: "管理后台", 
		stats
	});
}));

router.get('/errors', requireAdmin, asyncHandler(async (req, res, next) => {
	const page = parseInt(req.query.page) || 1;
	const level = req.query.level || '';
	const result = await adminService.getErrorLogs(page, 50, level);
	
	res.render('admin/errors.njk', {
		title: "错误日志",
		...result
	});
}));

router.get('/queue', requireAdmin, asyncHandler(async (req, res, next) => {
	const queueStatus = await adminService.getQueueStatus();
	res.render('admin/queue.njk', {
		title: "队列管理",
		queueStatus
	});
}));

router.get('/deletions', requireAdmin, asyncHandler(async (req, res, next) => {
	const type = req.query.type || 'article';
	const status = req.query.status || 'deleted';
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

router.get('/tokens', requireAdmin, asyncHandler(async (req, res, next) => {
	const page = parseInt(req.query.page) || 1;
	const search = req.query.search || '';
	const result = await adminService.getTokens(page, 30, search);

	res.render('admin/tokens.njk', {
		title: "Token 管理",
		...result
	});
}));

router.post('/api/jobs/cleanup', requireAdmin, asyncJsonHandler(async (req, res, next) => {
	const result = await adminWorker.executeCleanupJob();
	res.json(makeResponse(true, result));
}));

router.post('/api/jobs/update-problems', requireAdmin, asyncJsonHandler(async (req, res, next) => {
	const result = await adminWorker.executeUpdateProblemsJob();
	res.json(makeResponse(true, result));
}));

router.post('/api/restore/:type/:id', requireAdmin, asyncJsonHandler(async (req, res, next) => {
	const { type, id } = req.params;
	const result = await adminService.restoreItem(type, id);
	res.json(makeResponse(true, result));
}));

router.delete('/api/delete/:type/:id', requireAdmin, asyncJsonHandler(async (req, res, next) => {
	const { type, id } = req.params;
	const result = await adminService.deleteItem(type, id);
	res.json(makeResponse(true, result));
}));

router.delete('/api/tokens/:id', requireAdmin, asyncJsonHandler(async (req, res, next) => {
	const result = await adminService.deleteToken(req.params.id);
	res.json(makeResponse(true, result));
}));

router.post('/api/tokens/:id/role', requireAdmin, asyncJsonHandler(async (req, res, next) => {
    const { id } = req.params;
    const { role } = req.body;

    try {
        await updateTokenRole(id, role);
        res.json(makeResponse(true, { message: '角色更新成功' }));
    } catch (error) {
        res.json(makeResponse(false, { message: error.message }));
    }
}));

router.get('/api/queue/status', requireAdmin, asyncJsonHandler(async (req, res, next) => {
	const queueStatus = await adminService.getQueueStatus();
	res.json(makeResponse(true, { queueStatus }));
}));

router.get('/api/accounts', requireAdmin, asyncJsonHandler(async (req, res, next) => {
	const accounts = await adminService.getAccountsConfig();
	res.json(makeResponse(true, { accounts }));
}));

router.post('/api/accounts', requireAdmin, asyncJsonHandler(async (req, res, next) => {
	const { accounts } = req.body;
	const result = await adminService.updateAccountsConfig(accounts);
	res.json(makeResponse(true, result));
}));

router.post('/api/restart', requireAdmin, asyncJsonHandler(async (req, res, next) => {
	const result = await adminWorker.restartService();
	res.json(makeResponse(result.success, { message: result.message }));
}));

router.post('/api/mark-deleted/:type/:id', requireAdmin, asyncJsonHandler(async (req, res, next) => {
	const { type, id } = req.params;
	const { reason } = req.body;
	const result = await adminService.markItemDeleted(type, id, reason);
	await invalidateCache(`${type}:${id}`);
	res.json(makeResponse(true, result));
}));

router.get('/announcement', requireAdmin, asyncHandler(async (req, res, next) => {
	const settings = await adminService.getSettings();
	res.render('admin/announcement.njk', {
		title: "公告管理",
		announcement: settings.announcement
	});
}));

router.post('/api/announcement', requireAdmin, asyncJsonHandler(async (req, res, next) => {
	const { content, enabled } = req.body;
	const result = await adminService.updateAnnouncement(content, enabled);
	res.json(makeResponse(true, result));
}));

router.get('/banners', requireAdmin, asyncHandler(async (req, res, next) => {
	const banners = await adminService.getBanners();
	res.render('admin/banners.njk', {
		title: "Banner 管理",
		banners: banners
	});
}));

router.post('/api/banners', requireAdmin, asyncJsonHandler(async (req, res, next) => {
	const { banners } = req.body;
	const result = await adminService.updateBanners(banners);
	res.json(makeResponse(true, result));
}));

router.get('/ads', requireAdmin, asyncHandler(async (req, res, next) => {
	const ads = await adminService.getAds();
	res.render('admin/ads.njk', {
		title: "广告管理",
		ads: ads
	});
}));

router.post('/api/ads', requireAdmin, asyncJsonHandler(async (req, res, next) => {
	const { ads } = req.body;
	const result = await adminService.updateAds(ads);
	res.json(makeResponse(true, result));
}));

// 删除申请管理路由
router.get('/deletion-requests', requireAdmin, asyncHandler(async (req, res, next) => {
	const page = parseInt(req.query.page) || 1;
	const status = req.query.status || 'pending';
	const type = req.query.type || '';
	
	const result = await deletionRequestService.getDeletionRequests(page, 20, status, type);
	
	res.render('admin/deletion_requests.njk', {
		title: "删除申请审核",
		...result
	});
}));

router.post('/api/deletion-requests/:id/approve', requireAdmin, asyncJsonHandler(async (req, res, next) => {
	const { id } = req.params;
	const { admin_note } = req.body;
	const adminUid = req.user.id;
	
	const result = await deletionRequestService.approveDeletionRequest(parseInt(id), adminUid, admin_note);
	res.json(makeResponse(true, result));
}));

router.post('/api/deletion-requests/:id/reject', requireAdmin, asyncJsonHandler(async (req, res, next) => {
	const { id } = req.params;
	const { admin_note } = req.body;
	const adminUid = req.user.id;
	
	const result = await deletionRequestService.rejectDeletionRequest(parseInt(id), adminUid, admin_note);
	res.json(makeResponse(true, result));
}));

router.post('/api/deletion-requests/:id/ignore', requireAdmin, asyncJsonHandler(async (req, res, next) => {
	const { id } = req.params;
	const { admin_note } = req.body;
	const adminUid = req.user.id;
	
	const result = await deletionRequestService.ignoreDeletionRequest(parseInt(id), adminUid, admin_note);
	res.json(makeResponse(true, result));
}));

export default router;