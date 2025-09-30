import Redis from 'ioredis';

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
				// Limit reconnection attempts
				if (times >= this.maxReconnectAttempts) {
					console.warn('Redis max reconnection attempts reached. Disabling Redis.');
					return false;
				}
				// Exponential backoff: 1s, 2s, 4s, 8s, 16s
				return Math.min(Math.pow(2, times) * 1000, 30000);
			},
			connectTimeout: 10000,
		});
		
		this.redis.on('connect', () => {
			console.log('Redis connected');
			this.connected = true;
			this.reconnectAttempts = 0;
		});
		
		this.redis.on('error', (err) => {
			this.connected = false;
			console.error('Redis error:', err.message);
			
			// If it's a connection error and we've reached max attempts, disable further attempts
			if (err.code === 'ECONNREFUSED' && this.reconnectAttempts >= this.maxReconnectAttempts) {
				console.warn('Redis connection failed. Disabling Redis.');
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
			console.error('Redis SET error:', err.message);
			return false;
		}
	}
	
	async get(key) {
		if (!this.isConnected()) return null;
		
		try {
			return await this.redis.get(key);
		} catch (err) {
			console.error('Redis GET error:', err.message);
			return null;
		}
	}
	
	async del(key) {
		if (!this.isConnected()) return 0;
		
		try {
			return await this.redis.del(key);
		} catch (err) {
			console.error('Redis DEL error:', err.message);
			return 0;
		}
	}
	
	async exists(key) {
		if (!this.isConnected()) return false;
		
		try {
			return await this.redis.exists(key);
		} catch (err) {
			console.error('Redis EXISTS error:', err.message);
			return false;
		}
	}
	
	async keys(pattern) {
		if (!this.isConnected()) return [];
		
		try {
			return await this.redis.keys(pattern);
		} catch (err) {
			console.error('Redis KEYS error:', err.message);
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