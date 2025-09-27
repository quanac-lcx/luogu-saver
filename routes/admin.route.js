import express from 'express';
import { requireAdmin } from "../middleware/permission.js";
import cleanup from "../jobs/cleanup.js";
import { updateAllProblemSets } from "../services/problem.service.js";
import { makeResponse } from "../core/utils.js";

const router = express.Router();

router.get('/trigger/cleanup', requireAdmin, async (req, res, next) => {
	logger.debug("Admin triggered cleanup job.");
	cleanup();
	res.json(makeResponse(true));
});

router.get('/trigger/update-problems', requireAdmin, async (req, res, next) => {
	logger.debug("Admin triggered update problems job.");
	updateAllProblemSets();
	res.json(makeResponse(true));
});

export default router;