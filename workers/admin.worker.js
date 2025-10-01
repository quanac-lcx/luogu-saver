/**
 * 管理员工作器模块
 * 
 * 该模块提供管理员操作相关的工作器功能，包括：
 * - 作业执行（清理、题目更新等）
 * - 队列管理操作
 * - 系统重启操作
 * - 服务和业务逻辑协调
 * 
 * @author Copilot
 */

import cleanup from "../jobs/cleanup.js";
import { updateAllProblemSets } from "../services/problem.service.js";
import { exec } from "child_process";
import { promisify } from "util";
import config from "../config.js";
import logger from "../core/logger.js";

const execAsync = promisify(exec);

/**
 * 执行清理作业
 * 
 * @returns {Promise<Object>} 包含消息的成功结果
 */
export async function executeCleanupJob() {
    logger.debug("管理员启动了清理任务");
    cleanup();
    return { message: "清理任务已启动" };
}

/**
 * 执行题目更新作业
 * 
 * @returns {Promise<Object>} 包含消息的成功结果
 */
export async function executeUpdateProblemsJob() {
    logger.debug("管理员启动了题目更新任务");
    updateAllProblemSets();
    return { message: "题目更新任务已启动" };
}

/**
 * 使用可用方法重启服务
 * 
 * @returns {Promise<Object>} 包含成功状态和消息的结果
 */
export async function restartService() {
    // 首先尝试 PM2
    try {
        await execAsync(`pm2 restart ${config.service.name} || pm2 restart all`);
        return { success: true, message: "PM2 重启命令已执行" };
    } catch (pm2Error) {
        logger.debug("PM2 restart 失败, 尝试使用 systemctl");
    }

    // 备用方案：使用 systemctl
    try {
        await execAsync(`systemctl restart ${config.service.name}`);
        return { success: true, message: "systemctl 重启命令已执行" };
    } catch (systemctlError) {
        logger.debug("systemctl restart 失败");
    }

    // 如果两种方法都失败，建议手动重启
    return { success: false, message: "无法自动重启，请手动重启服务" };
}