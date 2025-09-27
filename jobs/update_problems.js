import { updateAllProblemSets } from "../services/problem.service.js";

export default async () => {
	logger.debug("Updating all problem sets...");
	await updateAllProblemSets();
	logger.debug("All problem sets updated.");
}