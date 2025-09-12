import { BaseModel } from "./common.js";
import { Raw } from "typeorm";

export default class Task extends BaseModel {

	static entityName = "Task";

	constructor(data) {
		super();
		Object.assign(this, data);
	}
	
	static async deleteExpired() {
		return this.deleteWhere({ expire_time: Raw((alias) => `${alias} <= NOW()` ) });
	}
}
