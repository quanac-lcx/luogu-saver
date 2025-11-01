/**
 * Banners 中间件
 * 
 * 将 banners 数据加载到所有页面的 res.locals 中
 */

import { getBanners } from '../services/settings.service.js';
import { hashContent } from '../core/utils.js';

async function bannersMiddleware(req, res, next) {
    try {
        const banners = await getBanners();
        res.locals.banners = banners
            .filter(b => b.enabled)
            .map(banner => ({
                ...banner,
                id: hashContent(banner.content)
            }));
    } catch (error) {
        res.locals.banners = [];
    }
    next();
}

export default bannersMiddleware;
