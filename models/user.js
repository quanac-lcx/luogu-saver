import { BaseModel } from "./common.js";
import { formatDate } from "../core/utils.js";

export default class User extends BaseModel {

	static entityName = "User";
	
	constructor(data) {
		super();
		Object.assign(this, data);
	}
	
	formatDate() {
		this.created_at = formatDate(this.created_at);
		this.updated_at = formatDate(this.updated_at);
	}
	
	async loadRelationships() {
		// User doesn't have relationships currently, but keep for consistency
	}
	
	// TODO: 用户主页数据分表
}
