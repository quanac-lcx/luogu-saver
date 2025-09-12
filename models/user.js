import { BaseModel } from "./common.js";

export default class User extends BaseModel {

	static entityName = "User";
	
	constructor(data) {
		super();
		Object.assign(this, data);
	}
}
