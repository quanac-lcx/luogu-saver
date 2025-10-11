import { BaseModel } from "./common.js";

export default class AccessKey extends BaseModel {
	
	static entityName = "AccessKey";
	
	constructor(data) {
		super();
		Object.assign(this, data);
	}
}
