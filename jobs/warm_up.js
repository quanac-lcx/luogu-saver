import { getStatistics } from "../services/benben.service.js";
import { runWithCacheContext } from "../middleware/cache_context.js";
import { logError } from "../core/errors.js";

export async function warmUpBenbenStatistics() {
	await runWithCacheContext({ shouldForceUpdateCache: true }, async () => {
		try {
			await getStatistics();
		} catch(e) {
			await logError(e, null);
		}
	});
}