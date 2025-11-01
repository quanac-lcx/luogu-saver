import { BaseModel } from "./common.js";
import { formatDate } from "../core/utils.js";
import User from "./user.js";

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
	
	static async findById(id) {
		return await UserIntroduction.findOne({ where: { id } });
	}
	
	async loadRelationships() {
		this.user = await User.findById(this.id);
	}
	
}
