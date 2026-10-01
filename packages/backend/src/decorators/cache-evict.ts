import { redisClient } from '@/lib/redis';
import { logger } from '@/lib/logger';

export async function evictCache(keys: string | string[]): Promise<void> {
    const keysToDelete = Array.isArray(keys) ? keys : [keys];
    if (keysToDelete.length === 0) return;

    try {
        await redisClient.del(...keysToDelete);
        logger.debug({ keys: keysToDelete }, 'Cache evicted successfully');
    } catch (err) {
        logger.error({ err }, 'Error evicting Redis cache');
    }
}

export function CacheEvict(keyGenerator: (...args: any[]) => string | string[]): MethodDecorator {
    return function (target: object, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
        const originalMethod = descriptor.value;
        descriptor.value = async function (...args: any[]) {
            const result = await originalMethod.apply(this, args);
            try {
                await evictCache(keyGenerator(...args));
            } catch (err) {
                logger.error({ err }, 'Error evicting Redis cache');
            }
            return result;
        };
        return descriptor;
    };
}
