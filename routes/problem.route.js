import express from 'express';
import { getProblems } from '../services/problem.service.js';
import { asyncHandler } from '../core/errors.js';

const router = express.Router();

router.get('/', asyncHandler(async (req, res, next) => {
	const { page, accept_solution, difficulty, prefix } = req.query;
	const result = await getProblems({ page, accept_solution, difficulty, prefix });
	
	res.render('content/problem_list.njk', {
		title: "题目列表",
		...result
	});
}));

export default router;