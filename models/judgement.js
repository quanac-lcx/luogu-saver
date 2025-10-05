import { BaseModel } from "./common.js";
import User from "./user.js";

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

	async loadRelationships() {
		this.user = await User.findById(this.user_uid);
	}

	/**
	 * Formats the time field for display.
	 * If no date is provided, formats this.time.
	 * @param {Date|string|null} date
	 * @returns {string}
	 */
	formatDate(date = null) {
		const d = date ? new Date(date) : (this.time ? new Date(this.time) : null);
		return d ? d.toLocaleString() : "";
	}
}
