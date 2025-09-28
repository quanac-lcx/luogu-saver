/**
 * Admin Worker Module
 * 
 * This module provides worker functions for admin operations, handling:
 * - Job execution (cleanup, problem updates, etc.)
 * - Queue management operations
 * - System restart operations
 * - Service and business logic coordination
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
 * Execute cleanup job
 * 
 * @returns {Promise<Object>} Success result with message
 */
export async function executeCleanupJob() {
    logger.debug("Admin triggered cleanup job.");
    cleanup();
    return { message: "清理任务已启动" };
}

/**
 * Execute problem update job
 * 
 * @returns {Promise<Object>} Success result with message
 */
export async function executeUpdateProblemsJob() {
    logger.debug("Admin triggered update problems job.");
    updateAllProblemSets();
    return { message: "题目更新任务已启动" };
}

/**
 * Restart the service using available methods
 * 
 * @returns {Promise<Object>} Result with success status and message
 */
export async function restartService() {
    // Try PM2 first
    try {
        await execAsync(`pm2 restart ${config.service.name} || pm2 restart all`);
        return { success: true, message: "PM2 重启命令已执行" };
    } catch (pm2Error) {
        logger.debug("PM2 restart failed, trying systemctl");
    }

    // Fallback to systemctl
    try {
        await execAsync(`systemctl restart ${config.service.name}`);
        return { success: true, message: "systemctl 重启命令已执行" };
    } catch (systemctlError) {
        logger.debug("systemctl restart failed");
    }

    // If both fail, suggest manual restart
    return { success: false, message: "无法自动重启，请手动重启服务" };
}