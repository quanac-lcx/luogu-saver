import { BaseModel } from "./common.js";
import User from "./user.js";

export default class ErrorLog extends BaseModel {

	static entityName = "ErrorLog";
	id = null;
	message = null;
	stack = null;
	method = null;
	url = null;
	user_id = null;
	ip = null;
	user_agent = null;
	level = "error";
	created_at = null;
	user = null;

	constructor(data) {
		super();
		Object.assign(this, data);
	}
	
	async loadRelationships() {
		if (this.user_id) {
			this.user = await User.findById(this.user_id);
		}
	}

	static async logError(message, stack, req = null, level = 'error') {
		const errorData = {
			message,
			stack,
			level,
		};

		if (req) {
			errorData.method = req.method;
			errorData.url = req.originalUrl;
			errorData.user_id = req.user ? req.user.id : null;
			errorData.ip = req.ip;
			errorData.user_agent = req.get('User-Agent');
		}

		const errorLog = this.create(errorData);
		await errorLog.save();
		return errorLog;
	}
}