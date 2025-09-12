import { BaseModel } from "./common.js";

export default class Token extends BaseModel {

	static entityName = "Token";
	
	constructor(data) {
		super();
		Object.assign(this, data);
	}
}
