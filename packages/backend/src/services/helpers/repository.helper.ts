import { BaseEntity } from '@/entities/base';
import { EntityManager, Repository } from 'typeorm';

type ActiveRecordEntity<T extends BaseEntity> = typeof BaseEntity & {
    new (): T;
    getRepository(): Repository<T>;
};

export function getServiceRepository<T extends BaseEntity>(
    entity: ActiveRecordEntity<T>,
    manager?: EntityManager
): Repository<T> {
    return manager ? manager.getRepository(entity) : entity.getRepository();
}
