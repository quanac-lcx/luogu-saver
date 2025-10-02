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
    const restartPromise = (async () => {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        try {
            await execAsync(`pm2 restart ${config.service.name} || pm2 restart all`);
            logger.info("PM2 重启命令已执行");
            return;
        } catch (error) {
            logger.debug("PM2 restart 失败, 尝试使用 systemctl");
        }

        try {
            await execAsync(`systemctl restart ${config.service.name}`);
            logger.info("systemctl 重启命令已执行");
            return;
        } catch (error) {
            logger.error("systemctl restart 失败，无法自动重启服务");
        }
    })();

    restartPromise.catch(error => {
        logger.error("重启服务时发生错误:", error);
        return { success: false, message: "重启服务时发生错误，请手动重启" };
    });

    return { success: true, message: "重启命令已提交，服务将在 1 秒后重启" };
}