import express from 'express';
import Problem from '../models/problem.js';
import {Like} from "typeorm";

const router = express.Router();

router.get('/', async (req, res, next) => {
	try {
		const page = req.query.page || '1';
		const accept_solution = req.query.accept_solution;
		const difficulty = req.query.difficulty;
		const prefix = req.query.prefix;
		const perPage = 50;
		const currentPage = Math.max(parseInt(page) || 1, 1);
		const where = {};
		if (prefix) {
			where.id = Like(`${prefix}%`);
		}
		if (accept_solution === 'true') {
			where.accept_solution = true;
		}
		else if (accept_solution === 'false') {
			where.accept_solution = false;
		}
		if (difficulty !== undefined) {
			const diff = parseInt(difficulty);
			if (!isNaN(diff)) {
				where.difficulty = diff;
			}
		}
		const problems = await Problem.createQueryBuilder('p')
			.where(where)
			.orderBy('p.id', 'ASC')
			.skip((currentPage - 1) * perPage)
			.take(perPage)
			.getMany();
		const pageCount = Math.ceil((await Problem.count({ where })) / perPage);
		problems.forEach(problem => Object.setPrototypeOf(problem, Problem.prototype));
		problems.forEach(problem => problem.formatDate());
		res.render('problem_list.njk', { title: "题目列表", problems, page, pageCount, prefix });
	} catch (error) {
		next(error);
	}
});

export default router;