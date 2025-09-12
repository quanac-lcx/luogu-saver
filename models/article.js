import { BaseModel } from "./common.js";
import User from "./user.js";

export default class Article extends BaseModel {
	
	static entityName = "Article";
	id = null;
	title = null;
	content = null;
	content_hash = null;
	category = 0;
	solutionFor_pid = null;
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
		this.author = await User.findById(this.author_uid);
	}
}
