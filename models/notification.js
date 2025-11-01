// filepath: d:\WebstormProjects\luogu-saver\models\notification.js
import { BaseModel } from "./common.js";

export default class Notification extends BaseModel {
    static entityName = "Notification";

    id = null;
    uid = null;
    type = 'info';
    title = '';
    content = '';
    link = null;
    read = false;
    created_at = null;

    constructor(data) {
        super();
        Object.assign(this, data);
    }

    static async createFor(uid, { type = 'info', title, content, link = null }) {
        const n = this.create({ uid, type, title, content, link, read: false });
        await n.save();
        return n;
    }
}

