import { Workflow } from '@/entities/workflow';
import { In, Not } from 'typeorm';
import { getServiceRepository } from '@/services/helpers/repository.helper';

const TERMINAL_WORKFLOW_STATUSES = ['completed', 'failed', 'expired'];

export class WorkflowStatusStore {
    static async updateById(id: string, status: string): Promise<string | null> {
        const result = await getServiceRepository<Workflow>(Workflow).update(
            { id, status: Not(In(TERMINAL_WORKFLOW_STATUSES)) },
            { status }
        );

        if (result.affected && result.affected > 0) {
            return status;
        }

        return this.getStatusById(id);
    }

    private static async getStatusById(id: string): Promise<string | null> {
        const workflow = await getServiceRepository<Workflow>(Workflow).findOne({
            where: { id },
            select: ['status']
        });

        return workflow?.status || null;
    }
}
