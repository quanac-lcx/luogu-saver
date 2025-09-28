/**
 * 题目服务模块
 * 
 * 该模块提供编程竞赛题目管理服务，包括：
 * - 从外部源同步题目数据
 * - 带筛选和分页的缓存题目列表
 * - 批量题目更新并使缓存失效
 * - 题目元数据管理
 * 
 * @author Copilot
 */

import * as cheerio from 'cheerio';
import fs from "fs";
import { In } from "typeorm";
import { Like } from "typeorm";

import Problem from "../models/problem.js";
import { fetchContent, defaultHeaders } from "../core/request.js";
import config from "../config.js";
import { sleep } from "../core/utils.js";
import { withCache, invalidateCacheByPattern } from "../core/cache.js";
import { paginateQuery } from "../core/pagination.js";

const accountPool = JSON.parse(fs.readFileSync("./accounts.json", "utf8"));

let isUpdatingAllProblemSets = false;

/**
 * 将多个题目保存到数据库并使缓存失效
 * 
 * 对题目数据执行批量upsert操作并使所有相关缓存条目失效，
 * 以确保数据一致性。
 * 
 * @param {Array<Object>} problems - 要保存的题目对象数组
 * @private
 */
async function saveProblems(problems) {
	if (!problems.length) return;
	
	try {
		// Perform bulk upsert operation
		await Problem.upsert(problems.map(p => ({
			id: p.id,
			difficulty: p.difficulty,
			accept_solution: p.accept_solution,
			solution_count: p.solution_count,
			title: p.title,
			updated_at: new Date()
		})), ["id"], { skipUpdateIfNoValuesChanged: true });
		
		logger.debug(`Bulk upsert completed: ${problems.length} problems processed.`);
		
		// Invalidate all problem-related cache entries
		await invalidateCacheByPattern('problems:*');
	} catch (error) {
		logger.warn(`Error saving problems: ${error.message}`);
	}
}

async function fetchProblemPage(page, type, retry = 0) {
	if (retry >= 3) return [];
	
	if (retry > 0) await utils.sleep(1000 * retry);
	try {
		const url = `https://www.luogu.com.cn/problem/list?type=${type}&page=${page}`;
		const html = (await fetchContent(url, defaultHeaders, { c3vk: "new" })).resp.data;
		const $ = cheerio.load(html);
		const json = JSON.parse($("#lentille-context").html());
		logger.debug(`Fetched problem page ${page} of type ${type}, ${json.data.problems.result.length} problems found.`);
		return json.data.problems.result.map(i => ({
			id: i.pid,
			difficulty: i.difficulty,
			title: i.title
		}));
	} catch (e) {
		logger.debug(`Error fetching problem page ${page} of type ${type} (attempt ${retry + 1}): ${e.message}`);
		return fetchProblemPage(page, type, retry + 1);
	}
}

async function fetchProblemTotal(type, retry = 0) {
	if (retry >= 3) return 0;
	
	if (retry > 0) await utils.sleep(1000 * retry);
	try {
		const url = `https://www.luogu.com.cn/problem/list?type=${type}&page=1`;
		const html = (await fetchContent(url, defaultHeaders, { c3vk: "new" })).resp.data;
		const json = JSON.parse(cheerio.load(html)("#lentille-context").html());
		const total = json.data.problems.count;
		logger.debug(`Total problems of type ${type}: ${total}`);
		return Math.ceil(total / 50);
	} catch (e) {
		logger.debug(`Error fetching total problem pages of type ${type} (attempt ${retry + 1}): ${e.message}`);
		return fetchProblemTotal(type, retry + 1);
	}
}

async function fetchProblemSolution(pid, retry = 0) {
	if (retry >= 3) return { accept_solution: false, solution_count: 0 };
	if (retry > 0) await sleep(1000 * retry);
	
	try {
		const url = `https://www.luogu.com.cn/problem/solution/${pid}`;
		const cookieStr = Object.entries(accountPool[Math.floor(Math.random() * accountPool.length)])
			.map(([k, v]) => `${k}=${v}`).join("; ");
		const html = (
			await fetchContent(url, {
				...defaultHeaders,
				Cookie: cookieStr
			}, { c3vk: "new" } )
		).resp.data;
		
		const json = JSON.parse(cheerio.load(html)("#lentille-context").html());
		return {
			accept_solution: Boolean(json.data.acceptSolution),
			solution_count: json.data.solutions ? parseInt(json.data.solutions.count) : 0
		};
	} catch (e) {
		logger.debug(`Error fetching solution for problem ${pid} (attempt ${retry + 1}): ${e.message}`);
		return fetchProblemSolution(pid, retry + 1);
	}
}

export async function updateProblemSet(type) {
	const total = await fetchProblemTotal(type);
	
	for (let page = 1; page <= total; page++) {
		const problems = await fetchProblemPage(page, type);
		
		const ids = problems.map(p => p.id);
		const existing = await Problem.find({ where: { id: In(ids) }, select: ["id", "updated_at"] });
		const existingMap = new Map(existing.map(e => [e.id, e]));
		
		const allProblems = [];
		
		for (let p of problems) {
			const dbProblem = existingMap.get(p.id);
			const now = Date.now();
			if (dbProblem && now - new Date(dbProblem.updated_at).getTime() < 18 * 60 * 60 * 1000) continue;
			
			try {
				const result = await fetchProblemSolution(p.id);
				p.accept_solution = result.accept_solution;
				p.solution_count = result.solution_count;
				allProblems.push(p);
			} catch (err) {
				allProblems.push(p);
			}
		}
		logger.debug(`Page ${page}/${total} of type ${type}: ${problems.length} problems fetched, ${allProblems.length} to update.`);
		if (allProblems.length > 0) await saveProblems(allProblems);
		await utils.sleep(500);
	}
}

export async function updateAllProblemSets() {
	if (isUpdatingAllProblemSets) {
		return;
	}
	try {
		isUpdatingAllProblemSets = true;
		const types = ["luogu", "CF", "SP", "UVA", "AT"];
		for (const type of types) {
			await updateProblemSet(type);
		}
	} finally {
		isUpdatingAllProblemSets = false;
	}
}

/**
 * 获取支持筛选、分页和缓存的题目
 * 
 * 根据各种筛选条件检索支持分页的题目。
 * 结果基于所有参数的缓存键缓存15分钟。
 * 
 * @param {Object} params - 筛选和分页参数
 * @param {number|string} [params.page=1] - 分页页码
 * @param {string} [params.accept_solution] - 按题解接受状态筛选（'true'/'false'）
 * @param {number|string} [params.difficulty] - 按难度级别筛选
 * @param {string} [params.prefix] - 按题目ID前缀筛选
 * @returns {Promise<Object>} 包含题目数组、分页信息和筛选条件的对象
 */
export async function getProblems({ page, accept_solution, difficulty, prefix }) {
	const perPage = config.pagination.problem;
	const currentPage = Math.max(parseInt(page) || 1, 1);
	
	// Create cache key based on all parameters
	const cacheKey = `problems:${currentPage}:${accept_solution || 'any'}:${difficulty || 'any'}:${prefix || 'none'}`;
	
	return await withCache({
		cacheKey,
		ttl: 900, // 15 minutes
		fetchFn: async () => {
			// Build where clause based on filters
			const where = {};
			
			if (prefix) {
				where.id = Like(`${prefix}%`);
			}
			
			if (accept_solution === 'true') {
				where.accept_solution = true;
			} else if (accept_solution === 'false') {
				where.accept_solution = false;
			}
			
			if (difficulty !== undefined) {
				const diff = parseInt(difficulty);
				if (!isNaN(diff)) {
					where.difficulty = diff;
				}
			}
			
			// Use pagination utility
			const result = await paginateQuery(Problem, {
				where,
				order: { id: 'ASC' },
				page: currentPage,
				limit: perPage,
				extra: { prefix, accept_solution, difficulty },
				processItems: async (problem) => {
					problem.formatDate();
				}
			});
			
			// Rename for compatibility
			result.problems = result.items;
			result.pageCount = result.totalPages;
			delete result.items;
			
			return result;
		}
	});
}