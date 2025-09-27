import express from "express";
import { getStatistics } from "../services/statistic.service.js";

const router = express.Router();

router.get("/statistic", async (req, res) => {
	try {
		res.json(utils.makeResponse(true, await getStatistics(req)));
	} catch (error) {
		logger.warn(`An error occurred while fetching statistics: ${error.message}`);
		res.json(utils.makeResponse(false, { message: error.message }));
	}
});

export default router;
