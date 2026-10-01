import { Censorship } from '@/entities/censorship';
import { CensorTarget } from '@/shared/task';
import { EntityManager } from 'typeorm';
import { getServiceRepository } from '@/services/helpers/repository.helper';

export class CensorshipService {
    static createCensorship(data: Partial<Censorship>, manager?: EntityManager): Censorship {
        return getServiceRepository<Censorship>(Censorship, manager).create(data);
    }

    static async saveCensorship(censorship: Censorship, manager?: EntityManager) {
        return await getServiceRepository<Censorship>(Censorship, manager).save(censorship);
    }

    static async getCensorshipsByTypeAndId(
        type: CensorTarget,
        targetId: string,
        manager?: EntityManager
    ): Promise<Censorship[] | null> {
        return await getServiceRepository<Censorship>(Censorship, manager).find({
            where: { type, targetId },
            order: { createdAt: 'DESC' }
        });
    }
}
