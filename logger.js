import chalk from 'chalk';
import { formatDate } from './utils.js';
import "dotenv/config";

export function info(msg) {
	console.log(`[INFO] [${formatDate(new Date())}] ${msg}`);
}

export function warn(msg) {
	console.log(`${chalk.yellow(`[WARN] [${formatDate(new Date())}] ${msg}`)}`);
}

export function error(msg) {
	console.error(`${chalk.red(`[ERROR] [${formatDate(new Date())}] ${msg}`)}`);
}

export function debug(msg) {
	if (process.env.DEBUG === "1") {
		console.log(`${chalk.greenBright(`[DEBUG] [${formatDate(new Date())}] ${msg}`)}`);
	}
}

export default { info, warn, error, debug };