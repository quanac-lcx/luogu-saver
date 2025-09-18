import { AppDataSource } from "../app.js";

export class BaseModel {

	static get repository() {
		return AppDataSource.getRepository(this.entityName);
	}
	
	static createQueryBuilder(alias) {
		return this.repository.createQueryBuilder(alias || this.entityName);
	}
	
	static create(data) {
		const entity = this.repository.create(data);
		return Object.setPrototypeOf(entity, this.prototype);
	}
	
	static async upsert(data, conflictPaths, options = {}) {
		await this.repository.upsert(data, { conflictPaths, ...options });
		return this;
	}
	
	static async find(options = {}) {
		const rows = await this.repository.find(options);
		return rows.map(row => Object.setPrototypeOf(row, this.prototype));
	}
	
	static async findOne(options) {
		const row = await this.repository.findOne(options);
		if (!row) return null;
		return Object.setPrototypeOf(row, this.prototype);
	}
	
	static async findById(id) {
		const row = await this.repository.findOneBy({ id });
		if (!row) return null;
		return Object.setPrototypeOf(row, this.prototype);
	}
	
	static async count(options = {}) {
		return this.repository.count(options);
	}
	
	async save() {
		return this.constructor.repository.save(this);
	}
	
	async remove() {
		return this.constructor.repository.remove(this);
	}
	
	static async deleteWhere(where) {
		return this.repository.delete(where);
	}
	
	static async deleteRaw(sql, params = {}) {
		return this.repository
			.createQueryBuilder()
			.delete()
			.from(this.entityName)
			.where(sql, params)
			.execute();
	}
	
	formatDate() {
		if (this.created_at) this.created_at = utils.formatDate(this.created_at);
		if (this.updated_at) this.updated_at = utils.formatDate(this.updated_at);
		if (this.expire_time) this.expire_time = utils.formatDate(this.expire_time);
		return this;
	}
}
