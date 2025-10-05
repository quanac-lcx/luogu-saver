import Redis from 'ioredis';
import { changeErrorType, DatabaseError, logError } from "./errors.js";

export default class RedisManager {
	constructor(options = {}) {
		this.options = {
			host: options.host || '127.0.0.1',
			port: options.port || 6379,
			password: options.password || null,
			db: options.db || 0,
		};
		
		this.connected = false;
		this.reconnectAttempts = 0;
		this.maxReconnectAttempts = 5;
		
		this.initRedis();
	}
	
	initRedis() {
		if (this.redis) {
			this.redis.disconnect();
		}
		
		this.redis = new Redis({
			host: this.options.host,
			port: this.options.port,
			password: this.options.password,
			db: this.options.db,
			retryStrategy: (times) => {
				if (times >= this.maxReconnectAttempts) {
					logError(new DatabaseError("Redis 连接重试次数超限"), null)
					return false;
				}
				return Math.min(Math.pow(2, times) * 1000, 30000);
			},
			connectTimeout: 10000,
		});
		
		this.redis.on('connect', () => {
			logger.info('Redis 连接成功');
			this.connected = true;
			this.reconnectAttempts = 0;
		});
		
		this.redis.on('error', async (err) => {
			this.connected = false;
			this.reconnectAttempts++;
			err = changeErrorType(err, DatabaseError);
			err.message = 'Redis 连接发生错误: ' + err.message;
			await logError(err, null)
			if (err.code === 'ECONNREFUSED' && this.reconnectAttempts >= this.maxReconnectAttempts) {
				logger.warn('已禁用 Redis，超过最大重试次数');
				this.redis.disconnect();
			}
		});
		
		this.redis.on('close', () => {
			this.connected = false;
		});
	}
	
	isConnected() {
		return this.connected && this.redis && this.redis.status === 'ready';
	}
	
	async set(key, value, expire) {
		if (!this.isConnected()) return false;
		
		try {
			await this.redis.set(key, value);
			if (expire) {
				await this.redis.expire(key, expire);
			}
			return true;
		} catch (err) {
			err = changeErrorType(err, DatabaseError);
			err.message = 'Redis SET 操作失败: ' + err.message;
			await logError(err, null);
			return false;
		}
	}
	
	async get(key) {
		if (!this.isConnected()) return null;
		
		try {
			return await this.redis.get(key);
		} catch (err) {
			err = changeErrorType(err, DatabaseError);
			err.message = 'Redis GET 操作失败: ' + err.message;
			await logError(err, null);
			return null;
		}
	}
	
	async del(key) {
		if (!this.isConnected()) return 0;
		
		try {
			return await this.redis.del(key);
		} catch (err) {
			err = changeErrorType(err, DatabaseError);
			err.message = 'Redis DEL 操作失败: ' + err.message;
			await logError(err, null);
			return 0;
		}
	}
	
	async exists(key) {
		if (!this.isConnected()) return false;
		
		try {
			return await this.redis.exists(key);
		} catch (err) {
			err = changeErrorType(err, DatabaseError);
			err.message = 'Redis EXISTS 操作失败: ' + err.message;
			await logError(err, null);
			return false;
		}
	}
	
	async keys(pattern) {
		if (!this.isConnected()) return [];
		
		try {
			return await this.redis.keys(pattern);
		} catch (err) {
			err = changeErrorType(err, DatabaseError);
			err.message = 'Redis KEYS 操作失败: ' + err.message;
			await logError(err, null);
			return [];
		}
	}
	
	close() {
		if (this.redis) {
			this.redis.disconnect();
		}
		this.connected = false;
	}
}