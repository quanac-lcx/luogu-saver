import { BaseModel } from "./common.js";
import User from "./user.js";

export default class Paste extends BaseModel {

	static entityName = "Paste";
	id = null;
	title = null;
	content = null;
	author_uid = null;
	author = null;
	deleted = false;
	deleted_reason = null;
	updated_at = null;
	created_at = null;

	constructor(data) {
		super();
		Object.assign(this, data);
	}
	
	async loadRelationships() {
		this.author = await User.findById(this.author_uid)
	}
}
