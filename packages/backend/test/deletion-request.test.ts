import { beforeEach, describe, expect, it, vi } from 'vitest';

const entities = vi.hoisted(() => {
    class Article {}
    class Paste {}
    class RegisteredUser {}
    class DeletionRequest {
        static transaction: (run: (manager: object) => Promise<unknown>) => Promise<unknown>;
    }
    return { Article, Paste, RegisteredUser, DeletionRequest };
});

const mocks = vi.hoisted(() => ({
    articleGet: vi.fn(),
    articleSave: vi.fn(),
    pasteSave: vi.fn(),
    findOne: vi.fn(),
    findMany: vi.fn(),
    getRepository: vi.fn(),
    createNotification: vi.fn(),
    searchUpsert: vi.fn(),
    embeddingUpdate: vi.fn()
}));

vi.mock('@/services/article.service', () => ({
    ArticleService: {
        getArticleByIdWithAuthorWithoutCache: mocks.articleGet,
        saveArticle: mocks.articleSave
    }
}));

vi.mock('@/entities/article', () => ({ Article: entities.Article }));
vi.mock('@/entities/paste', () => ({ Paste: entities.Paste }));
vi.mock('@/entities/registered-user', () => ({ RegisteredUser: entities.RegisteredUser }));
vi.mock('@/entities/deletion-request', () => ({ DeletionRequest: entities.DeletionRequest }));

vi.mock('@/services/paste.service', () => ({
    PasteService: {
        savePaste: mocks.pasteSave
    }
}));

vi.mock('@/services/helpers/repository.helper', () => ({
    findOneServiceEntity: mocks.findOne,
    findServiceEntities: mocks.findMany,
    getServiceRepository: mocks.getRepository
}));

vi.mock('@/services/user-notification.service', () => ({
    UserNotificationService: { createNotification: mocks.createNotification }
}));

vi.mock('@/services/search.service', () => ({
    SearchService: { upsertArticle: mocks.searchUpsert }
}));

vi.mock('@/services/embedding.service', () => ({
    EmbeddingService: { updateArticleDeletionState: mocks.embeddingUpdate }
}));

import { DeletionRequestService } from '../src/services/deletion-request.service';

const { Article, DeletionRequest, Paste, RegisteredUser } = entities;

const NOW = new Date('2026-09-24T12:00:00.000Z');

function createRepository() {
    return {
        create: vi.fn((data: Record<string, unknown>) =>
            Object.assign(new DeletionRequest(), data, {
                id: 1,
                createdAt: NOW,
                updatedAt: NOW
            })
        ),
        save: vi.fn(async (row: InstanceType<typeof DeletionRequest>) => row),
        findAndCount: vi.fn()
    };
}

function createRequester(luoguUid: number) {
    return Object.assign(new RegisteredUser(), {
        id: 7,
        luoguUid,
        name: 'requester',
        avatarUrl: null
    });
}

describe('DeletionRequestService author auto-approval', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.createNotification.mockResolvedValue({});
        mocks.articleSave.mockImplementation(async article => article);
        mocks.pasteSave.mockImplementation(async paste => paste);
        mocks.searchUpsert.mockResolvedValue(undefined);
        mocks.embeddingUpdate.mockResolvedValue(undefined);
        DeletionRequest.transaction = vi.fn(async run => run({}));
    });

    it('automatically approves an article author request and exposes system as the handler', async () => {
        const repository = createRepository();
        const requester = createRequester(42);
        const article = Object.assign(new Article(), {
            id: 'article1',
            title: 'Title',
            authorId: 42,
            deleted: false,
            deleteReason: null
        });

        mocks.articleGet.mockResolvedValue(article);
        mocks.findOne.mockImplementation(async entity => {
            if (entity === DeletionRequest) return null;
            if (entity === RegisteredUser) return requester;
            return null;
        });
        mocks.getRepository.mockReturnValue(repository);

        const result = await DeletionRequestService.createRequest(7, {
            targetType: 'article',
            targetId: 'article1',
            reason: 'author request'
        });

        expect(result.status).toBe('approved');
        expect(result.resolutionComment).toBe('自动通过');
        expect(article.deleted).toBe(true);
        expect(article.deleteReason).toBe('应用户申请删除');
        expect(mocks.articleSave).toHaveBeenCalledWith(article);
        expect(mocks.searchUpsert).toHaveBeenCalledWith(article);
        expect(mocks.embeddingUpdate).toHaveBeenCalledWith('article1', true);
        expect(mocks.createNotification).toHaveBeenCalledWith(
            expect.objectContaining({
                recipientId: 7,
                title: '删除申请已通过',
                content:
                    '您对文章 article1的删除申请已通过，相关内容已被删除。\n处理备注：自动通过',
                metadata: expect.objectContaining({ outcome: 'approved' })
            }),
            expect.anything()
        );

        const stored = repository.save.mock.calls.at(-1)?.[0] as InstanceType<
            typeof DeletionRequest
        > & {
            handlerId: number | null;
            handlerKind: string | null;
        };
        expect(stored.handlerId).toBeNull();
        expect(stored.handlerKind).toBe('system');

        repository.findAndCount.mockResolvedValue([[stored], 1]);
        mocks.findMany.mockImplementation(async entity => {
            if (entity === RegisteredUser) return [requester];
            if (entity === Article) return [article];
            return [];
        });

        const adminList = await DeletionRequestService.listAdminRequests('approved');
        expect(adminList.requests[0].handler).toEqual({ id: null, name: 'system' });
    });

    it('automatically approves a paste author request', async () => {
        const repository = createRepository();
        const requester = createRequester(42);
        const paste = Object.assign(new Paste(), {
            id: 'paste001',
            authorId: 42,
            deleted: false,
            deleteReason: '管理员删除'
        });

        mocks.findOne.mockImplementation(async entity => {
            if (entity === Paste) return paste;
            if (entity === DeletionRequest) return null;
            if (entity === RegisteredUser) return requester;
            return null;
        });
        mocks.getRepository.mockReturnValue(repository);

        const result = await DeletionRequestService.createRequest(7, {
            targetType: 'paste',
            targetId: 'paste001',
            reason: 'author request'
        });

        expect(result.status).toBe('approved');
        expect(paste.deleted).toBe(true);
        expect(paste.deleteReason).toBe('应用户申请删除');
        expect(mocks.pasteSave).toHaveBeenCalledWith(paste);
        expect(mocks.searchUpsert).not.toHaveBeenCalled();
        expect(mocks.embeddingUpdate).not.toHaveBeenCalled();
    });

    it('leaves a non-author request pending', async () => {
        const repository = createRepository();
        const requester = createRequester(99);
        const article = Object.assign(new Article(), {
            id: 'article1',
            authorId: 42,
            deleted: false
        });

        mocks.articleGet.mockResolvedValue(article);
        mocks.findOne.mockImplementation(async entity => {
            if (entity === DeletionRequest) return null;
            if (entity === RegisteredUser) return requester;
            return null;
        });
        mocks.getRepository.mockReturnValue(repository);

        const result = await DeletionRequestService.createRequest(7, {
            targetType: 'article',
            targetId: 'article1',
            reason: 'not author'
        });

        expect(result.status).toBe('pending');
        expect(mocks.articleSave).not.toHaveBeenCalled();
        expect(mocks.createNotification).not.toHaveBeenCalled();
    });
});
