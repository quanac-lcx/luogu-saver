import express from "express";
import { getStatistics } from "../services/statistic.service.js";
import { logError } from "../core/errors.js";

const router = express.Router();

router.get("/statistic", async (req, res) => {
	try {
		res.json(utils.makeResponse(true, await getStatistics()));
	} catch (error) {
		await logError(error, req, logger);
		res.json(utils.makeResponse(false, { message: error.message }));
	}
});

export default router;
