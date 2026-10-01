import { Announcement } from '@/entities/announcement';
import { getServiceRepository } from '@/services/helpers/repository.helper';

export type AnnouncementInput = {
    title?: unknown;
    content?: unknown;
    enabled?: unknown;
};

export type AnnouncementResponse = {
    id: number;
    title: string;
    content: string;
    enabled: boolean;
    createdAt?: Date;
    updatedAt?: Date;
};

const ANNOUNCEMENT_ID = 1;
const DEFAULT_TITLE = '公告';

export class AnnouncementService {
    static async getPublicAnnouncement(): Promise<AnnouncementResponse | null> {
        const announcement = await this.getStoredAnnouncement();
        if (!announcement || !this.normalizeEnabled(announcement.enabled)) return null;
        return this.toResponse(announcement, false);
    }

    static async getAdminAnnouncement(): Promise<AnnouncementResponse> {
        const announcement = await this.getStoredAnnouncement();
        if (announcement) return this.toResponse(announcement, true);

        return {
            id: ANNOUNCEMENT_ID,
            title: DEFAULT_TITLE,
            content: '',
            enabled: true
        };
    }

    static async updateAnnouncement(input: AnnouncementInput): Promise<AnnouncementResponse> {
        const existing = await this.getStoredAnnouncement();
        const announcement = existing || Announcement.create({ id: ANNOUNCEMENT_ID });

        announcement.title = this.normalizeTitle(input.title);
        announcement.content = String(input.content ?? '');
        announcement.enabled = this.normalizeEnabled(input.enabled);

        await getServiceRepository<Announcement>(Announcement).save(announcement);
        return this.toResponse(announcement, true);
    }

    private static async getStoredAnnouncement(): Promise<Announcement | null> {
        return await getServiceRepository<Announcement>(Announcement).findOne({
            where: { id: ANNOUNCEMENT_ID }
        });
    }

    private static normalizeTitle(value: unknown): string {
        const title = String(value ?? '').trim();
        return title || DEFAULT_TITLE;
    }

    private static normalizeEnabled(value: unknown): boolean {
        if (typeof value === 'boolean') return value;
        if (typeof value === 'number') return value !== 0;
        if (typeof value === 'string') {
            const normalized = value.trim().toLowerCase();
            return normalized === 'true' || normalized === '1';
        }
        return false;
    }

    private static toResponse(
        announcement: Announcement,
        includeCreatedAt: boolean
    ): AnnouncementResponse {
        return {
            id: announcement.id,
            title: announcement.title,
            content: announcement.content,
            enabled: this.normalizeEnabled(announcement.enabled),
            ...(includeCreatedAt ? { createdAt: announcement.createdAt } : {}),
            updatedAt: announcement.updatedAt
        };
    }
}
