/**
 * 设置服务模块
 * 
 * 提供系统设置相关功能
 */

import { readFile } from 'fs/promises';
import { join } from 'path';

/**
 * 获取系统设置
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
 * 获取公告内容
 * 
 * @returns {Promise<Object>} 公告对象，包含 content 和 enabled
 */
export async function getAnnouncement() {
    const settings = await getSettings();
    return settings.announcement || {
        content: "欢迎使用洛谷保存站！如遇问题请及时反馈。",
        enabled: true
    };
}

/**
 * 获取 banners 列表
 * 
 * @returns {Promise<Array>} banners 数组
 */
export async function getBanners() {
    const settings = await getSettings();
    return settings.banners || [];
}

/**
 * 获取广告列表
 * 
 * @returns {Promise<Array>} 广告数组
 */
export async function getAds() {
    const settings = await getSettings();
    return settings.ads || [];
}
