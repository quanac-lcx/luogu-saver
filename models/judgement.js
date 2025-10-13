import { BaseModel } from "./common.js";
import User from "./user.js";
import { DatabaseError } from "../core/errors.js";

export default class Judgement extends BaseModel {

	static entityName = "Judgement";
	id = null;
	user_uid = null;
	user = null;
	reason = null;
	permission_granted = null;
	permission_revoked = null;
	time = null;
	created_at = null;

	constructor(data) {
		super();
		Object.assign(this, data);
	}
	
	static async count(options = {}) {
		try {
			return this.repository.count(options);
		} catch (err) {
			if (err.name === 'QueryFailedError' || err.code?.startsWith('ER_')) {
				throw new DatabaseError(`Database count failed: ${err.message}`);
			}
			throw err;
		}
	}

	async loadRelationships() {
		this.user = await User.findById(this.user_uid);
	}
}
