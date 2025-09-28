/**
 * Admin Service Module
 * 
 * This module provides admin-specific services, including:
 * - Statistics and dashboard data retrieval
 * - Soft deletion management (restore/delete articles and pastes)
 * - Queue information and management
 * - Token management operations
 * - Accounts configuration management
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

/**
 * Get admin dashboard statistics
 * 
 * @returns {Promise<Object>} Dashboard statistics object
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
 * Get error logs with pagination and filtering
 * 
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {string} level - Log level filter
 * @param {string} search - Search query (optional)
 * @returns {Promise<Object>} Object containing errors, currentPage, totalPages
 */
export async function getErrorLogs(page = 1, limit = 50, level = '') {
    const whereCondition = {};
    
    if (level) {
        whereCondition.level = level;
    }
    
    // Note: For TypeORM, we'll handle search separately with query builder if needed
    // For now, we'll use the basic functionality
    
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
 * Get queue status with detailed information
 * 
 * @returns {Promise<Object>} Queue status with task details
 */
export async function getQueueStatus() {
    return {
        length: queue.getQueueLength(),
        running: queue.getRunning(),
        tasks: queue.getAllTasks ? queue.getAllTasks() : [] // Get all tasks if available
    };
}

/**
 * Get deleted items (articles or pastes) with pagination
 * 
 * @param {string} type - Type of items ('article' or 'paste')
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {string} search - Search query (optional)
 * @returns {Promise<Object>} Object containing items, currentPage, totalPages, type
 */
export async function getDeletedItems(type = 'article', page = 1, limit = 20, search = '') {
    let whereCondition = { deleted: true };
    
    // Add enhanced search functionality for both ID and title
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
 * Get undeleted items (articles or pastes) with pagination for deletion marking
 * 
 * @param {string} type - Type of items ('article' or 'paste')
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {string} search - Search query (optional)
 * @returns {Promise<Object>} Object containing items, currentPage, totalPages, type
 */
export async function getUndeletedItems(type = 'article', page = 1, limit = 20, search = '') {
    let whereCondition = { deleted: false };
    
    // Add enhanced search functionality for both ID and title
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
 * Restore a deleted item (article or paste)
 * 
 * @param {string} type - Type of item ('article' or 'paste')
 * @param {string} id - Item ID
 * @returns {Promise<Object>} Success result with message
 */
export async function restoreItem(type, id) {
    if (type === 'article') {
        const article = await Article.findById(id);
        if (!article) {
            throw new Error("专栏不存在");
        }
        article.deleted = false;
        await article.save();
    } else if (type === 'paste') {
        const paste = await Paste.findById(id);
        if (!paste) {
            throw new Error("剪贴板不存在");
        }
        paste.deleted = false;
        await paste.save();
    } else {
        throw new Error("不支持的类型");
    }

    return { message: "恢复成功" };
}

/**
 * Permanently delete an item (article or paste)
 * 
 * @param {string} type - Type of item ('article' or 'paste')
 * @param {string} id - Item ID
 * @returns {Promise<Object>} Success result with message
 */
export async function deleteItem(type, id) {
    if (type === 'article') {
        const article = await Article.findById(id);
        if (!article) {
            throw new Error("专栏不存在");
        }
        await article.remove();
    } else if (type === 'paste') {
        const paste = await Paste.findById(id);
        if (!paste) {
            throw new Error("剪贴板不存在");
        }
        await paste.remove();
    } else {
        throw new Error("不支持的类型");
    }

    return { message: "删除成功" };
}

/**
 * Get tokens with pagination
 * 
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {string} search - Search query (optional)
 * @returns {Promise<Object>} Object containing tokens, currentPage, totalPages
 */
export async function getTokens(page = 1, limit = 30, search = '') {
    const whereCondition = {};
    
    // Add search functionality for UID
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
 * Delete a token by ID
 * 
 * @param {string} id - Token ID
 * @returns {Promise<Object>} Success result with message
 */
export async function deleteToken(id) {
    const token = await Token.findById(id);
    if (!token) {
        throw new Error("Token 不存在");
    }
    
    await token.remove();
    return { message: "Token 删除成功" };
}

/**
 * Get accounts configuration
 * 
 * @returns {Promise<Array>} Accounts array
 */
export async function getAccountsConfig() {
    try {
        const accountsPath = join(process.cwd(), 'accounts.json');
        const content = await readFile(accountsPath, 'utf8');
        return JSON.parse(content);
    } catch (error) {
        // If file doesn't exist, return empty array
        return [];
    }
}

/**
 * Mark a single item as deleted with specified reason
 * 
 * @param {string} type - Type of item ('article' or 'paste')
 * @param {string} id - Item ID
 * @param {string} reason - Deletion reason (cannot be null)
 * @returns {Promise<Object>} Success result with message
 */
export async function markItemDeleted(type, id, reason = "手动删除") {
    if (!reason || reason.trim() === '') {
        throw new Error("删除原因不能为空");
    }
    
    if (type === 'article') {
        const article = await Article.findById(id);
        if (!article) {
            throw new Error("专栏不存在");
        }
        if (article.deleted) {
            throw new Error("该专栏已经被删除");
        }
        article.deleted = true;
        article.deleted_reason = reason.trim();
        await article.save();
        return { message: "专栏已标记为删除" };
    } else if (type === 'paste') {
        const paste = await Paste.findById(id);
        if (!paste) {
            throw new Error("剪贴板不存在");
        }
        if (paste.deleted) {
            throw new Error("该剪贴板已经被删除");
        }
        paste.deleted = true;
        paste.deleted_reason = reason.trim();
        await paste.save();
        return { message: "剪贴板已标记为删除" };
    } else {
        throw new Error("不支持的类型");
    }
}

/**
 * Update accounts configuration
 * 
 * @param {Array} accounts - Updated accounts array
 * @returns {Promise<Object>} Success result with message
 */
export async function updateAccountsConfig(accounts) {
    const accountsPath = join(process.cwd(), 'accounts.json');
    
    // Validate accounts format
    if (!Array.isArray(accounts)) {
        throw new Error("Accounts must be an array");
    }

    // Basic validation for account structure
    for (const account of accounts) {
        if (!account._uid || !account.__client_id) {
            throw new Error("Each account must have _uid and __client_id");
        }
    }
    
    await writeFile(accountsPath, JSON.stringify(accounts, null, '\t'));
    return { message: "账户配置更新成功" };
}