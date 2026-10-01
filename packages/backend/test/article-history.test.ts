import { createHash } from 'crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EntityManager } from 'typeorm';
import type { DataSource } from 'typeorm';
import type { Article as LuoguArticle } from '../src/types/luogu-api';

const entities = vi.hoisted(() => {
    class Article {
        static getRepository: () => unknown;
        static transaction: (run: (manager: EntityManager) => Promise<unknown>) => Promise<unknown>;
    }
    class ArticleHistory {
        static getRepository: () => unknown;
    }
    return { Article, ArticleHistory };
});

const redis = vi.hoisted(() => ({
    entries: new Map<string, string>(),
    failEviction: false
}));

vi.mock('@/entities/article', () => ({ Article: entities.Article }));
vi.mock('@/entities/article-history', () => ({ ArticleHistory: entities.ArticleHistory }));
vi.mock('@/lib/logger', () => ({
    logger: { debug: vi.fn(), error: vi.fn(), warn: vi.fn() }
}));
vi.mock('@/lib/redis', () => ({
    redisClient: {
        async get(key: string) {
            return redis.entries.get(key) ?? null;
        },
        async set(key: string, value: string) {
            redis.entries.set(key, value);
            return 'OK';
        },
        async del(...keys: string[]) {
            if (redis.failEviction) throw new Error('Redis unavailable');
            return keys.filter(key => redis.entries.delete(key)).length;
        }
    }
}));

import { ArticleService } from '../src/services/article.service';
import { ArticleHistoryService } from '../src/services/article-history.service';

const { Article, ArticleHistory } = entities;
const UPDATED_AT = new Date('2026-09-24T12:00:00.000Z');

type ArticleRow = {
    id: string;
    title: string;
    content: string;
    contentHash: string;
    publishTime: number | null;
    updatedAt: Date;
    deleted: boolean;
};
type HistoryRow = { articleId: string; version: number; title: string; content: string };
type Snapshot = { article: ArticleRow | null; history: HistoryRow[] };

let committed: Snapshot;
let beforeCommit: (manager: EntityManager, attempt: number) => Promise<void>;
let attempts: number;
let historyReadsUnavailable: boolean;

function articleRepository(snapshot: Snapshot) {
    return {
        async findOne() {
            return snapshot.article ? Object.assign(new Article(), snapshot.article) : null;
        },
        async count() {
            return snapshot.article && !snapshot.article.deleted ? 1 : 0;
        },
        create(data: Record<string, unknown>) {
            return Object.assign(new Article(), data);
        },
        async insert(data: ArticleRow) {
            if (snapshot.article) throw Object.assign(new Error('Duplicate ID'), { errno: 1062 });
            snapshot.article = { ...data };
        },
        async update(_where: unknown, data: Partial<ArticleRow>) {
            if (snapshot.article) snapshot.article = { ...snapshot.article, ...data };
        }
    };
}

function historyRepository(snapshot: Snapshot, committedRead = false) {
    return {
        async findOne() {
            const latest = snapshot.history.at(-1);
            return latest ? { ...latest } : null;
        },
        async find() {
            if (committedRead && historyReadsUnavailable) throw new Error('History DB unavailable');
            return snapshot.history.map(row => Object.assign(new ArticleHistory(), row));
        },
        create(data: HistoryRow) {
            return Object.assign(new ArticleHistory(), data);
        },
        async save(row: HistoryRow) {
            snapshot.history.push({ ...row });
            return row;
        }
    };
}

function transactionManager(snapshot: Snapshot): EntityManager {
    const manager = new EntityManager({
        getMetadata: () => ({
            updateDateColumn: { propertyName: 'updatedAt', databaseName: 'updated_at' }
        }),
        driver: { escape: (column: string) => `\`${column}\`` }
    } as unknown as DataSource);
    vi.spyOn(manager, 'getRepository').mockImplementation(
        entity =>
            (entity === Article
                ? articleRepository(snapshot)
                : historyRepository(snapshot)) as never
    );
    vi.spyOn(manager, 'update').mockImplementation(async (_entity, _where, data) => {
        if (
            snapshot.article?.publishTime === null &&
            'publishTime' in data &&
            typeof data.publishTime === 'number'
        ) {
            snapshot.article.publishTime = data.publishTime;
        }
        return { affected: 1, raw: [], generatedMaps: [] };
    });
    return manager;
}

function payload(title = 'New title', content = 'New content', time = 0): LuoguArticle {
    return {
        lid: 'article1',
        title,
        content,
        time,
        author: {
            uid: 42,
            name: 'Author',
            avatar: '',
            slogan: null,
            badge: null,
            isAdmin: false,
            isBanned: false,
            color: 'Gray',
            ccfLevel: 0,
            xcpcLevel: 0,
            background: null
        },
        category: 3,
        upvote: 0,
        favorCount: 0,
        replyCount: 0,
        status: 2,
        solutionFor: null,
        promoteStatus: 0,
        collection: null,
        top: 0
    };
}

async function historyContent(manager?: EntityManager): Promise<string[]> {
    const history = await ArticleHistoryService.getHistoryByArticleId('article1', manager);
    return history.map(row => `${row.version}:${row.title}:${row.content}`);
}

const OLD_HISTORY = ['1:Old title:Old content'];
const NEW_HISTORY = [...OLD_HISTORY, '2:New title:New content'];

describe('article history transaction visibility', () => {
    beforeEach(() => {
        redis.entries.clear();
        redis.failEviction = false;
        historyReadsUnavailable = false;
        attempts = 0;
        beforeCommit = async () => {};
        committed = {
            article: {
                id: 'article1',
                title: 'Old title',
                content: 'Old content',
                contentHash: createHash('sha256').update('Old content').digest('hex'),
                publishTime: null,
                updatedAt: UPDATED_AT,
                deleted: false
            },
            history: [
                { articleId: 'article1', version: 1, title: 'Old title', content: 'Old content' }
            ]
        };
        Article.getRepository = () => articleRepository(committed);
        ArticleHistory.getRepository = () => historyRepository(committed, true);
        Article.transaction = async run => {
            const attempt = ++attempts;
            const pending: Snapshot = {
                article: committed.article ? { ...committed.article } : null,
                history: committed.history.map(row => ({ ...row }))
            };
            const manager = transactionManager(pending);
            const result = await run(manager);
            // A reader between callback completion and commit must see only committed rows.
            await beforeCommit(manager, attempt);
            committed = pending;
            return result;
        };
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('refreshes a history read made after the append but before commit', async () => {
        expect(await historyContent()).toEqual(OLD_HISTORY);
        beforeCommit = async manager => {
            expect(await historyContent(manager)).toEqual(NEW_HISTORY);
            expect(await historyContent()).toEqual(OLD_HISTORY);
        };

        expect(await ArticleService.saveLuoguArticle(payload())).toEqual({
            skipped: false,
            content: 'New content'
        });
        expect(await historyContent()).toEqual(NEW_HISTORY);
        expect(await ArticleService.getArticleById('article1')).toMatchObject({
            title: 'New title',
            content: 'New content'
        });
    });

    it('keeps committed article and history available from cache after rollback', async () => {
        expect(await historyContent()).toEqual(OLD_HISTORY);
        expect(await ArticleService.getArticleById('article1')).toMatchObject({
            content: 'Old content'
        });
        expect(await ArticleService.getArticleCount()).toBe(1);
        const commitFailure = new Error('Commit rejected');
        beforeCommit = async manager => {
            expect(await historyContent(manager)).toEqual(NEW_HISTORY);
            throw commitFailure;
        };

        await expect(ArticleService.saveLuoguArticle(payload())).rejects.toBe(commitFailure);
        historyReadsUnavailable = true;
        Article.getRepository = () => {
            throw new Error('Article DB unavailable');
        };
        expect(await historyContent()).toEqual(OLD_HISTORY);
        expect(await ArticleService.getArticleById('article1')).toMatchObject({
            content: 'Old content'
        });
        expect(await ArticleService.getArticleCount()).toBe(1);
        expect(committed.article?.content).toBe('Old content');
        expect(committed.history).toEqual([
            { articleId: 'article1', version: 1, title: 'Old title', content: 'Old content' }
        ]);
    });

    it('discards a conflicted version and refreshes history only after the retry commits', async () => {
        vi.useFakeTimers();
        expect(await historyContent()).toEqual(OLD_HISTORY);
        beforeCommit = async (manager, attempt) => {
            expect(await historyContent(manager)).toEqual(NEW_HISTORY);
            historyReadsUnavailable = true;
            try {
                expect(await historyContent()).toEqual(OLD_HISTORY);
            } finally {
                historyReadsUnavailable = false;
            }
            if (attempt === 1) {
                throw Object.assign(new Error('Commit deadlock'), { code: 'ER_LOCK_DEADLOCK' });
            }
        };

        const saving = expect(ArticleService.saveLuoguArticle(payload())).resolves.toEqual({
            skipped: false,
            content: 'New content'
        });
        await vi.runAllTimersAsync();
        await saving;
        expect(await historyContent()).toEqual(NEW_HISTORY);
    });

    it('backfills publish time on a skipped save without invalidating history', async () => {
        expect(await historyContent()).toEqual(OLD_HISTORY);
        expect(await ArticleService.getArticleById('article1')).toMatchObject({
            publishTime: null
        });
        const unchanged = payload('Old title', 'Old content', 1_700_000_000);

        expect(await ArticleService.saveLuoguArticle(unchanged)).toEqual({
            skipped: true,
            content: ''
        });
        expect(await ArticleService.getArticleById('article1')).toMatchObject({
            publishTime: 1_700_000_000,
            updatedAt: UPDATED_AT
        });
        historyReadsUnavailable = true;
        expect(await historyContent()).toEqual(OLD_HISTORY);
        expect(await ArticleService.saveLuoguArticle(unchanged)).toEqual({
            skipped: true,
            content: ''
        });
        expect(committed.article?.updatedAt).toEqual(UPDATED_AT);
        expect(committed.history).toEqual([
            { articleId: 'article1', version: 1, title: 'Old title', content: 'Old content' }
        ]);
    });

    it('returns the committed save when Redis invalidation fails', async () => {
        redis.failEviction = true;

        expect(await ArticleService.saveLuoguArticle(payload())).toEqual({
            skipped: false,
            content: 'New content'
        });
        expect(await historyContent()).toEqual(NEW_HISTORY);
        expect(await ArticleService.getArticleByIdWithoutCache('article1')).toMatchObject({
            title: 'New title',
            content: 'New content'
        });
    });
});
