import { BaseModel } from "./common.js";
import User from "./user.js";
import Article from "./article.js";
import Paste from "./paste.js";

export default class DeletionRequest extends BaseModel {

	static entityName = "DeletionRequest";
	id = null;
	type = null;
	item_id = null;
	requester_uid = null;
	reason = null;
	status = 'pending';
	admin_uid = null;
	admin_note = null;
	processed_at = null;
	created_at = null;

	requester = null;
	admin = null;
	item = null;

	constructor(data) {
		super();
		Object.assign(this, data);
	}
	
	async loadRelationships() {
		if (this.requester_uid) {
			this.requester = await User.findById(this.requester_uid);
		}
		
		if (this.admin_uid) {
			this.admin = await User.findById(this.admin_uid);
		}
		
		if (this.type && this.item_id) {
			if (this.type === 'article') {
				this.item = await Article.findById(this.item_id);
				if (this.item) {
					await this.item.loadRelationships();
				}
			} else if (this.type === 'paste') {
				this.item = await Paste.findById(this.item_id);
				if (this.item) {
					await this.item.loadRelationships();
				}
			}
		}
	}
	
	
	/**
	 * 检查用户是否有待处理的申请
	 * @param {string} type - 内容类型
	 * @param {string} itemId - 内容ID
	 * @param {number} requesterUid - 申请人ID
	 * @returns {Promise<DeletionRequest|null>}
	 */
	static async findUserPendingRequest(type, itemId, requesterUid) {
		return await this.findOne({
			where: {
				type,
				item_id: itemId,
				requester_uid: requesterUid,
				status: 'pending'
			}
		});
	}
}
