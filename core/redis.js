import Redis from 'ioredis';

export default class RedisManager {
	constructor(options = {}) {
		this.redis = new Redis({
			host: options.host || '127.0.0.1',
			port: options.port || 6379,
			password: options.password || null,
			db: options.db || 0,
		});
		
		this.redis.on('connect', () => {
			console.log('Redis connected');
		});
		
		this.redis.on('error', (err) => {
			console.error('Redis error:', err);
		});
	}
	
	async set(key, value, expire) {
		await this.redis.set(key, value);
		if (expire) {
			await this.redis.expire(key, expire);
		}
	}
	
	async get(key) {
		return this.redis.get(key);
	}
	
	async del(key) {
		return this.redis.del(key);
	}
	
	async exists(key) {
		return this.redis.exists(key);
	}
	
	close() {
		this.redis.disconnect();
	}
}
