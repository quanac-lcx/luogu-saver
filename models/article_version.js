import { BaseModel } from "./common.js";

export default class ArticleVersion extends BaseModel {

	static entityName = "ArticleVersion";

	constructor(data) {
		super();
		Object.assign(this, data);
	}
	
	static async getLatestVersion(id) {
		return await this.find({
			where: { origin_id: id },
			order: { version: 'DESC' },
			take: 1
		});
	}
}
