import { updateAllProblemSets } from "../services/problem.service.js";

export default async () => {
	logger.debug("更新题目列表...");
	await updateAllProblemSets();
	logger.debug("题目列表更新完成");
}