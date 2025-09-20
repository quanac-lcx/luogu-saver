import { updateAllProblemSets } from "../services/problem.service.js";

export default async () => {
	await updateAllProblemSets();
}