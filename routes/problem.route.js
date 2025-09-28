import express from 'express';
import { getProblems } from '../services/problem.service.js';

const router = express.Router();

router.get('/', async (req, res, next) => {
	try {
		const { page, accept_solution, difficulty, prefix } = req.query;
		const result = await getProblems({ page, accept_solution, difficulty, prefix });
		
		res.render('content/problem_list.njk', {
			title: "题目列表",
			...result
		});
	} catch (error) {
		next(error);
	}
});

export default router;