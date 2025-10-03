import { AppDataSource } from "../app.js";
import { DatabaseError } from "../core/errors.js";
import { formatDate } from "../core/utils.js";

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
		try {
			await this.repository.upsert(data, { conflictPaths, ...options });
			return this;
		} catch (err) {
			if (err.name === 'QueryFailedError' || err.code?.startsWith('ER_')) {
				throw new DatabaseError(`Database upsert failed: ${err.message}`);
			}
			throw err;
		}
	}
	
	static async find(options = {}) {
		try {
			const rows = await this.repository.find(options);
			return rows.map(row => Object.setPrototypeOf(row, this.prototype));
		} catch (err) {
			if (err.name === 'QueryFailedError' || err.code?.startsWith('ER_')) {
				throw new DatabaseError(`Database find failed: ${err.message}`);
			}
			throw err;
		}
	}
	
	static async findOne(options) {
		try {
			const row = await this.repository.findOne(options);
			if (!row) return null;
			return Object.setPrototypeOf(row, this.prototype);
		} catch (err) {
			if (err.name === 'QueryFailedError' || err.code?.startsWith('ER_')) {
				throw new DatabaseError(`Database findOne failed: ${err.message}`);
			}
			throw err;
		}
	}
	
	static async findById(id) {
		try {
			const row = await this.repository.findOneBy({ id });
			if (!row) return null;
			return Object.setPrototypeOf(row, this.prototype);
		} catch (err) {
			if (err.name === 'QueryFailedError' || err.code?.startsWith('ER_')) {
				throw new DatabaseError(`Database findById failed: ${err.message}`);
			}
			throw err;
		}
	}
	
	static async count(options = {}) {
		try {
			return this.repository.count(options);
		} catch (err) {
			if (err.name === 'QueryFailedError' || err.code?.startsWith('ER_')) {
				throw new DatabaseError(`Database count failed: ${err.message}`);
			}
			throw err;
		}
	}
	
	async save() {
		try {
			return this.constructor.repository.save(this);
		} catch (err) {
			if (err.name === 'QueryFailedError' || err.code?.startsWith('ER_')) {
				throw new DatabaseError(`Database save failed: ${err.message}`);
			}
			throw err;
		}
	}
	
	async remove() {
		try {
			return this.constructor.repository.remove(this);
		} catch (err) {
			if (err.name === 'QueryFailedError' || err.code?.startsWith('ER_')) {
				throw new DatabaseError(`Database remove failed: ${err.message}`);
			}
			throw err;
		}
	}
	
	static async deleteWhere(where) {
		try {
			return this.repository.delete(where);
		} catch (err) {
			if (err.name === 'QueryFailedError' || err.code?.startsWith('ER_')) {
				throw new DatabaseError(`Database deleteWhere failed: ${err.message}`);
			}
			throw err;
		}
	}
	
	static async deleteRaw(sql, params = {}) {
		try {
			return this.repository
				.createQueryBuilder()
				.delete()
				.from(this.entityName)
				.where(sql, params)
				.execute();
		} catch (err) {
			if (err.name === 'QueryFailedError' || err.code?.startsWith('ER_')) {
				throw new DatabaseError(`Database deleteRaw failed: ${err.message}`);
			}
			throw err;
		}
	}
	
	formatDate() {
		if (this.created_at) this.created_at = formatDate(this.created_at);
		if (this.updated_at) this.updated_at = formatDate(this.updated_at);
		if (this.expire_time) this.expire_time = formatDate(this.expire_time);
		return this;
	}
}
