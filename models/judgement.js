import { BaseModel } from "./common.js";
import User from "./user.js";
import * as utils from "../core/utils.js";

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

	formatDate() {
		super.formatDate();
		if (this.created_at) {
			const dateObj = (this.created_at instanceof Date) ? this.created_at : new Date(this.created_at);
			this.formatted_date = utils.formatDate(dateObj);
		}
		return this;
	}
}
