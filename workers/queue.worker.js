let queue = [];
let running = 0;

export function pushTask(task) { queue.push(task); }
export function popTask() { return queue.shift(); }
export function hasTask() { return queue.length > 0; }
export function incRunning() { running++; }
export function decRunning() { running--; }
export function getRunning() { return running; }
export function getQueueLength() { return queue.length; }
export function getQueuePosition(taskId) {
	for (let i = 0; i < queue.length; i++) {
		if (queue[i].id === taskId) {
			return i + 1;
		}
	}
	return 0;
}