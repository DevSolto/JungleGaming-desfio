"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TASK_FORWARDING_PATTERNS = exports.TASK_EVENT_PATTERNS = void 0;
exports.TASK_EVENT_PATTERNS = {
    CREATED: "task.created",
    UPDATED: "task.updated",
    DELETED: "task.deleted",
    COMMENT_CREATED: "task.comment.created",
};
exports.TASK_FORWARDING_PATTERNS = {
    COMMENT_CREATED: "tasks.comment.created",
    CREATED: "tasks.created",
    UPDATED: "tasks.updated",
    DELETED: "tasks.deleted",
};
