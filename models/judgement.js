import { BaseModel } from "./common.js";
import User from "./user.js";
import * as utils from "../core/utils.js";

export default class Judgement extends BaseModel {

	static entityName = "Judgement";
	id = null;
	user_uid = null;
	user = null;
	reason = null;
	permission_granted = null;
	permission_revoked = null;
	time = null;
	created_at = null;

	constructor(data) {
		super();
		Object.assign(this, data);
	}

	async loadRelationships() {
		this.user = await User.findById(this.user_uid);
	}

	formatDate() {
		// 调用父类的 formatDate 方法
		super.formatDate();
		// 格式化 time 字段并设置 formatted_date 供模板使用
		if (this.time) {
			this.formatted_date = utils.formatDate(this.time);
		}
		return this;
	}
}
