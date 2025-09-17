import { BaseModel } from "./common.js";

export default class Problem extends BaseModel {
	
	static entityName = "Problem";
	
	constructor(data) {
		super();
		Object.assign(this, data);
	}
}