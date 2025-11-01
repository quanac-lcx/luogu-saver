import { BaseModel } from "./common.js";
import { formatDate } from "../core/utils.js";

export default class UserIntroduction extends BaseModel {

	static entityName = "UserIntroduction";
	
	constructor(data) {
		super();
		Object.assign(this, data);
	}
	
	formatDate() {
		this.created_at = formatDate(this.created_at);
		this.updated_at = formatDate(this.updated_at);
	}
	
	async loadRelationships() {
	}
}
