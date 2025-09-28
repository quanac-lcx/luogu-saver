/**
 * 分页工具模块
 * 
 * 提供可重用的分页逻辑和工具函数，避免在服务和控制器中重复实现分页功能
 * 
 * @author Copilot
 */

/**
 * 计算分页偏移量
 * 
 * @param {number} page - 当前页码（从1开始）
 * @param {number} limit - 每页项目数
 * @returns {number} 数据库查询的偏移量
 */
export function calculateOffset(page, limit) {
    return (page - 1) * limit;
}

/**
 * 计算总页数
 * 
 * @param {number} totalCount - 总项目数
 * @param {number} limit - 每页项目数
 * @returns {number} 总页数
 */
export function calculateTotalPages(totalCount, limit) {
    return Math.ceil(totalCount / limit);
}

/**
 * 创建分页结果对象
 * 
 * @param {Array} items - 当前页的数据项
 * @param {number} currentPage - 当前页码
 * @param {number} totalCount - 总项目数
 * @param {number} limit - 每页项目数
 * @param {Object} extra - 额外的属性（如type等）
 * @returns {Object} 包含分页信息的结果对象
 */
export function createPaginationResult(items, currentPage, totalCount, limit, extra = {}) {
    const totalPages = calculateTotalPages(totalCount, limit);
    
    return {
        items,
        currentPage,
        totalPages,
        totalCount,
        limit,
        hasNextPage: currentPage < totalPages,
        hasPrevPage: currentPage > 1,
        ...extra
    };
}

/**
 * 通用分页查询助手
 * 
 * @param {Object} model - 数据模型（Article, Paste, Token等）
 * @param {Object} options - 查询选项
 * @param {Object} options.where - 查询条件
 * @param {Object} options.order - 排序条件
 * @param {number} options.page - 页码
 * @param {number} options.limit - 每页项目数
 * @param {Object} options.extra - 额外返回属性
 * @param {Function} options.processItems - 处理项目的回调函数（可选）
 * @returns {Promise<Object>} 分页结果对象
 */
export async function paginateQuery(model, options) {
    const {
        where = {},
        order = { created_at: "DESC" },
        page = 1,
        limit = 20,
        extra = {},
        processItems = null
    } = options;
    
    const offset = calculateOffset(page, limit);
    
    const items = await model.find({
        where,
        order,
        skip: offset,
        take: limit
    });
    
    // 如果提供了处理函数，对每个项目执行处理
    if (processItems) {
        for (const item of items) {
            await processItems(item);
        }
    }
    
    const totalCount = await model.count({ where });
    
    return createPaginationResult(items, page, totalCount, limit, extra);
}