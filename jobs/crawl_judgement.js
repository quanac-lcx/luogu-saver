import { pushTaskToQueue } from "../workers/index.worker.js";

export default async() => {
	const url = 'https://www.luogu.com.cn/judgement';
	const id = await pushTaskToQueue({ url, aid: Date.now(), type: 3 });
}