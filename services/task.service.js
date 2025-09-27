/**
 * Task Service Module
 * 
 * This module provides services for managing background tasks, including:
 * - Task creation and queuing
 * - Task status updates and tracking  
 * - Task retrieval and status mapping
 * - Queue management for pending and processing tasks
 * 
 * Note: Tasks are NOT cached due to their highly dynamic nature.
 * Task status changes very frequently and caching would provide stale data.
 * 
 * @author Copilot
 */

import Task from "../models/task.js";

/**
 * Create a new task in the queue
 * 
 * Generates a new task with a unique ID and sets it to pending status.
 * Tasks are created with a 7-day expiration time.
 * 
 * @param {Object} task - Task configuration object
 * @param {string} task.aid - Associated article/paste ID
 * @param {number} task.type - Task type (0=article, 1=paste)
 * @returns {Promise<string>} Generated task ID
 */
export async function createTask(task) {
	const id = utils.generateRandomString();
	const newTask = Task.create({
		id,
		status: 0, // Pending
		info: 'Your task is in the queue.',
		expire_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
		oid: task.aid,
		type: task.type
	});
	await newTask.save();
	return id;
}

/**
 * Update task status and information
 * 
 * Updates a task's status and optional information message.
 * This method does NOT use caching as task status changes frequently.
 * 
 * @param {string} id - Task ID to update
 * @param {number} status - New status code (0=pending, 1=processing, 2=completed, 3=failed)
 * @param {string} [info=""] - Optional status information message
 */
export async function updateTask(id, status, info = "") {
	const task = await Task.findById(id);
	task.status = status;
	task.info = info;
	await task.save();
}

/**
 * Get all waiting tasks (pending or processing)
 * 
 * Retrieves tasks that are either pending (status 0) or processing (status 1).
 * Results are ordered by ID for consistent processing order.
 * This method does NOT use caching as task queues change frequently.
 * 
 * @returns {Promise<Array>} Array of waiting task objects
 */
export async function getWaitingTasks() {
	return await Task.createQueryBuilder("t")
		.where("t.status = 0 OR t.status = 1")
		.orderBy("t.id", "ASC")
		.getMany();
}

// Status code mapping for human-readable status names
const statusMap = {
	0: 'Pending',
	1: 'Processing', 
	2: 'Completed',
	3: 'Failed',
};

/**
 * Get task by ID with status mapping
 * 
 * Retrieves a task by its ID and formats the status for display.
 * This method does NOT use caching as task status changes very frequently
 * and users need to see real-time status updates.
 * 
 * @param {string} id - Task ID to retrieve
 * @returns {Promise<Object|null>} Task object with formatted status, or null if not found
 */
export async function getTaskById(id) {
	const task = await Task.findById(id);
	if (!task) return null;
	
	// Format date and status for display
	task.formatDate();
	task.status = statusMap[task.status] || 'Unknown';
	
	return task;
}