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
 * @returns {Promise<Object>} Object containing errors, currentPage, totalPages
 */
export async function getErrorLogs(page = 1, limit = 50, level = '') {
    const offset = (page - 1) * limit;
    const whereCondition = level ? { level } : {};
    
    const errors = await ErrorLog.find({
        where: whereCondition,
        order: { created_at: "DESC" },
        skip: offset,
        take: limit
    });

    // Load user relationships
    for (const error of errors) {
        await error.loadRelationships();
        error.formatDate();
    }

    const totalCount = await ErrorLog.count({ where: whereCondition });
    const totalPages = Math.ceil(totalCount / limit);

    return { errors, currentPage: page, totalPages, level };
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
 * @returns {Promise<Object>} Object containing items, currentPage, totalPages, type
 */
export async function getDeletedItems(type = 'article', page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    let items = [];
    let totalCount = 0;

    if (type === 'article') {
        items = await Article.find({
            where: { deleted: true },
            order: { updated_at: "DESC" },
            skip: offset,
            take: limit
        });
        totalCount = await Article.count({ where: { deleted: true } });
    } else if (type === 'paste') {
        items = await Paste.find({
            where: { deleted: true },
            order: { updated_at: "DESC" },
            skip: offset,
            take: limit
        });
        totalCount = await Paste.count({ where: { deleted: true } });

        // Load relationships for pastes
        for (const paste of items) {
            await paste.loadRelationships();
        }
    }

    const totalPages = Math.ceil(totalCount / limit);

    return { items, type, currentPage: page, totalPages };
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
 * @returns {Promise<Object>} Object containing tokens, currentPage, totalPages
 */
export async function getTokens(page = 1, limit = 30) {
    const offset = (page - 1) * limit;

    const tokens = await Token.find({
        order: { created_at: "DESC" },
        skip: offset,
        take: limit
    });
    
    for (const token of tokens) {
		token.formatDate();
	}

    const totalCount = await Token.count();
    const totalPages = Math.ceil(totalCount / limit);

    return { tokens, currentPage: page, totalPages };
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