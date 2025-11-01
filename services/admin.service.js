/**
 * 管理员服务模块
 * 
 * 该模块提供管理员专用服务功能，包括：
 * - 统计和仪表板数据获取
 * - 软删除管理（恢复/删除文章和剪贴板）
 * - 队列信息和管理
 * - Token 管理操作
 * - 账户配置管理
 * 
 * @author Copilot
 */

import ErrorLog from "../models/error_log.js";
import Article from "../models/article.js";
import Paste from "../models/paste.js";
import Token from "../models/token.js";
import * as queue from "../workers/queue.worker.js";
import { paginateQuery, createSearchCondition } from "../core/pagination.js";
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { NotFoundError, ValidationError, logError } from "../core/errors.js";

/**
 * 获取管理员仪表板统计信息
 * 
 * @returns {Promise<Object>} 仪表板统计对象
 */
export async function getDashboardStats() {
	return {
		errors: {
			total: await ErrorLog.count()
		},
		queue: {
			length: queue.getQueueLength(),
			running: queue.getRunning()
		},
		articles: {
			total: await Article.count(),
			deleted: await Article.count({ where: { deleted: true } })
		},
		pastes: {
			total: await Paste.count(),
			deleted: await Paste.count({ where: { deleted: true } })
		},
		tokens: await Token.count()
	};
}

/**
 * 获取带分页和筛选的错误日志
 * 
 * @param {number} page - 页码
 * @param {number} limit - 每页数量
 * @param {string} level - 日志级别筛选
 * @returns {Promise<Object>} 包含错误列表、当前页、总页数的对象
 */
export async function getErrorLogs(page = 1, limit = 50, level = '') {
    const whereCondition = {};
    
    if (level) {
        whereCondition.level = level;
    }
    
    return await paginateQuery(ErrorLog, {
        where: whereCondition,
        order: { created_at: "DESC" },
        page,
        limit,
        extra: { level },
        processItems: async (error) => {
            await error.loadRelationships();
            error.formatDate();
        }
    });
}

/**
 * 获取队列状态和详细信息
 * 
 * @returns {Promise<Object>} 包含任务详情的队列状态
 */
export async function getQueueStatus() {
    return {
        length: queue.getQueueLength(),
        running: queue.getRunning(),
        tasks: queue.getAllTasks ? queue.getAllTasks() : []
    };
}

/**
 * 获取已删除项目（文章或剪贴板）的分页列表
 * 
 * @param {string} type - 项目类型（'article' 或 'paste'）
 * @param {number} page - 页码
 * @param {number} limit - 每页数量
 * @param {string} search - 搜索查询（可选）
 * @returns {Promise<Object>} 包含项目列表、当前页、总页数、类型的对象
 */
export async function getDeletedItems(type = 'article', page = 1, limit = 20, search = '') {
    let whereCondition = { deleted: true };
    
    if (search && search.trim()) {
        const trimmedSearch = search.trim();
        const model = type === 'article' ? Article : Paste;
     	whereCondition.id = trimmedSearch;
    }
    
    const model = type === 'article' ? Article : Paste;
    
    return await paginateQuery(model, {
        where: whereCondition,
        order: { updated_at: "DESC" },
        page,
        limit,
        extra: { type, search },
        processItems: type === 'paste' ? async (paste) => {
            await paste.loadRelationships();
        } : null
    });
}

/**
 * 获取未删除项目（文章或剪贴板）的分页列表，用于标记删除
 * 
 * @param {string} type - 项目类型（'article' 或 'paste'）
 * @param {number} page - 页码
 * @param {number} limit - 每页数量
 * @param {string} search - 搜索查询（可选）
 * @returns {Promise<Object>} 包含项目列表、当前页、总页数、类型的对象
 */
export async function getUndeletedItems(type = 'article', page = 1, limit = 20, search = '') {
    let whereCondition = { deleted: false };
    
    if (search && search.trim()) {
        const trimmedSearch = search.trim();
        const model = type === 'article' ? Article : Paste;
        whereCondition.id = trimmedSearch;
    }
    
    const model = type === 'article' ? Article : Paste;
    
    return await paginateQuery(model, {
        where: whereCondition,
        order: { updated_at: "DESC" },
        page,
        limit,
        extra: { type, search },
        processItems: async (item) => {
            await item.loadRelationships();
        }
    });
}

/**
 * 恢复已删除的项目（文章或剪贴板）
 * 
 * @param {string} type - 项目类型（'article' 或 'paste'）
 * @param {string} id - 项目 ID
 * @returns {Promise<Object>} 包含成功消息的结果
 */
export async function restoreItem(type, id) {
    if (type === 'article') {
        const article = await Article.findById(id);
        if (!article) {
            throw new NotFoundError("专栏不存在");
        }
        article.deleted = false;
        await article.save();
    } else if (type === 'paste') {
        const paste = await Paste.findById(id);
        if (!paste) {
            throw new NotFoundError("剪贴板不存在");
        }
        paste.deleted = false;
        await paste.save();
    } else {
        throw new ValidationError("不支持的类型");
    }

    return { message: "恢复成功" };
}

/**
 * 永久删除项目（文章或剪贴板）
 * 
 * @param {string} type - 项目类型（'article' 或 'paste'）
 * @param {string} id - 项目 ID
 * @returns {Promise<Object>} 包含成功消息的结果
 */
export async function deleteItem(type, id) {
    if (type === 'article') {
        const article = await Article.findById(id);
        if (!article) {
            throw new NotFoundError("专栏不存在");
        }
        await article.remove();
    } else if (type === 'paste') {
        const paste = await Paste.findById(id);
        if (!paste) {
            throw new NotFoundError("剪贴板不存在");
        }
        await paste.remove();
    } else {
        throw new ValidationError("不支持的类型");
    }

    return { message: "删除成功" };
}

/**
 * 获取带分页的 Token 列表
 * 
 * @param {number} page - 页码
 * @param {number} limit - 每页数量
 * @param {string} search - 搜索查询（可选）
 * @returns {Promise<Object>} 包含 Token 列表、当前页、总页数的对象
 */
export async function getTokens(page = 1, limit = 30, search = '') {
    const whereCondition = {};
    
    if (search && search.trim()) {
        whereCondition.uid = createSearchCondition(search);
    }
    
    return await paginateQuery(Token, {
        where: whereCondition,
        order: { created_at: "DESC" },
        page,
        limit,
        extra: { search },
        processItems: async (token) => {
            token.formatDate();
        }
    });
}

/**
 * 根据 ID 删除 Token
 * 
 * @param {string} id - Token ID
 * @returns {Promise<Object>} 包含成功消息的结果
 */
export async function deleteToken(id) {
    const token = await Token.findById(id);
    if (!token) {
        throw new NotFoundError("Token 不存在");
    }
    
    await token.remove();
    return { message: "Token 删除成功" };
}

/**
 * 获取账户配置
 * 
 * @returns {Promise<Array>} 账户数组
 */
export async function getAccountsConfig() {
    try {
        const accountsPath = join(process.cwd(), 'accounts.json');
        const content = await readFile(accountsPath, 'utf8');
        return JSON.parse(content);
    } catch (error) {
        return [];
    }
}

/**
 * 将单个项目标记为已删除并指定原因
 * 
 * @param {string} type - 项目类型（'article' 或 'paste'）
 * @param {string} id - 项目 ID
 * @param {string} reason - 删除原因（不能为空）
 * @returns {Promise<Object>} 包含成功消息的结果
 */
export async function markItemDeleted(type, id, reason = "手动删除") {
    if (!reason || reason.trim() === '') {
        throw new ValidationError("删除原因不能为空");
    }
    
    if (type === 'article') {
        const article = await Article.findById(id);
        if (!article) {
            throw new NotFoundError("专栏不存在");
        }
        if (article.deleted) {
            throw new ValidationError("该专栏已经被删除");
        }
        article.deleted = true;
        article.deleted_reason = reason.trim();
        await article.save();
        return { message: "专栏已标记为删除" };
    } else if (type === 'paste') {
        const paste = await Paste.findById(id);
        if (!paste) {
            throw new NotFoundError("剪贴板不存在");
        }
        if (paste.deleted) {
            throw new ValidationError("该剪贴板已经被删除");
        }
        paste.deleted = true;
        paste.deleted_reason = reason.trim();
        await paste.save();
        return { message: "剪贴板已标记为删除" };
    } else {
        throw new ValidationError("不支持的类型");
    }
}

/**
 * 更新账户配置
 * 
 * @param {Array} accounts - 更新后的账户数组
 * @returns {Promise<Object>} 包含成功消息的结果
 */
export async function updateAccountsConfig(accounts) {
    const accountsPath = join(process.cwd(), 'accounts.json');
    
    if (!Array.isArray(accounts)) {
        throw new ValidationError("账户配置必须是数组");
    }

    for (const account of accounts) {
        if (!account._uid || !account.__client_id) {
            throw new ValidationError("每个账户必须包含 _uid 和 __client_id");
        }
    }
    
    await writeFile(accountsPath, JSON.stringify(accounts, null, '\t'));
    return { message: "账户配置更新成功" };
}

/**
 * 获取系统设置（包括公告）
 * 
 * @returns {Promise<Object>} 系统设置对象
 */
export async function getSettings() {
    try {
        const settingsPath = join(process.cwd(), 'contentConfig.json');
        const content = await readFile(settingsPath, 'utf8');
        return JSON.parse(content);
    } catch (error) {
        // 如果文件不存在，返回默认设置
        return {
            announcement: {
                content: "欢迎使用洛谷保存站！如遇问题请及时反馈。",
                enabled: true
            },
            banners: []
        };
    }
}

/**
 * 更新公告内容
 * 
 * @param {string} content - 公告内容（支持 HTML）
 * @param {boolean} enabled - 是否启用公告
 * @returns {Promise<Object>} 包含成功消息的结果
 */
export async function updateAnnouncement(content, enabled = true) {
    try {
        const settings = await getSettings();
        settings.announcement = {
            content: content || "",
            enabled: enabled
        };
        
        const settingsPath = join(process.cwd(), 'contentConfig.json');
        await writeFile(settingsPath, JSON.stringify(settings, null, '\t'));
        
        return { message: "公告更新成功" };
    } catch (error) {
        await logError(error);
        throw error;
    }
}

/**
 * 获取所有 banners
 * 
 * @returns {Promise<Array>} banners 数组
 */
export async function getBanners() {
    const settings = await getSettings();
    return settings.banners || [];
}

/**
 * 更新 banners
 * 
 * @param {Array} banners - banners 数组
 * @returns {Promise<Object>} 包含成功消息的结果
 */
export async function updateBanners(banners) {
    try {
        if (!Array.isArray(banners)) {
            throw new ValidationError("banners 必须是数组");
        }

        for (const banner of banners) {
            if (!banner.content || typeof banner.content !== 'string') {
                throw new ValidationError("每个 banner 必须包含 content 字段");
            }
            if (typeof banner.enabled !== 'boolean') {
                throw new ValidationError("每个 banner 必须包含 enabled 字段");
            }
        }

        const settings = await getSettings();
        settings.banners = banners;
        
        const settingsPath = join(process.cwd(), 'contentConfig.json');
        await writeFile(settingsPath, JSON.stringify(settings, null, '\t'));
        
        return { message: "Banners 更新成功" };
    } catch (error) {
        await logError(error);
        throw error;
    }
}

/**
 * 获取所有广告
 * 
 * @returns {Promise<Array>} 广告数组
 */
export async function getAds() {
    const settings = await getSettings();
    return settings.ads || [];
}

/**
 * 更新广告列表
 * 
 * @param {Array} ads - 广告数组
 * @returns {Promise<Object>} 包含成功消息的结果
 */
export async function updateAds(ads) {
    try {
        if (!Array.isArray(ads)) {
            throw new ValidationError("广告列表必须是数组");
        }

        for (const ad of ads) {
            if (!ad.imageUrl || !ad.linkUrl || !ad.description) {
                throw new ValidationError("每个广告必须包含 imageUrl, linkUrl 和 description");
            }
        }

        const settings = await getSettings();
        settings.ads = ads;
        
        const settingsPath = join(process.cwd(), 'contentConfig.json');
        await writeFile(settingsPath, JSON.stringify(settings, null, '\t'));
        
        return { message: "广告列表更新成功" };
    } catch (error) {
        await logError(error);
        throw error;
    }
}