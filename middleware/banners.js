/**
 * Banners 中间件
 * 
 * 将 banners 数据加载到所有页面的 res.locals 中
 */

import { getBanners } from '../services/settings.service.js';

async function bannersMiddleware(req, res, next) {
    try {
        const banners = await getBanners();
        // 只传递启用的 banners
        res.locals.banners = banners.filter(b => b.enabled);
    } catch (error) {
        // 如果加载失败，设置为空数组
        res.locals.banners = [];
    }
    next();
}

export default bannersMiddleware;
