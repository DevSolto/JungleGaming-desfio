import {
  AUTH_MESSAGE_PATTERNS,
  TASKS_MESSAGE_PATTERNS,
  TASK_EVENT_PATTERNS,
  TASK_FORWARDING_PATTERNS,
  TASKS_RPC_CLIENT,
  TASKS_EVENTS_CLIENT,
  NOTIFICATIONS_GATEWAY_CLIENT,
} from "@repo/types";

describe("@repo/types runtime contract", () => {
  it("exposes auth message patterns", () => {
    expect(AUTH_MESSAGE_PATTERNS).toEqual(
      expect.objectContaining({
        REGISTER: "auth.register",
        LOGIN: "auth.login",
        REFRESH: "auth.refresh",
        LOGOUT: "auth.logout",
        PING: "auth.ping",
      }),
    );
  });

  it("exposes task message and event patterns", () => {
    expect(TASKS_MESSAGE_PATTERNS).toEqual(
      expect.objectContaining({
        CREATE: "tasks.create",
        FIND_ALL: "tasks.findAll",
        FIND_BY_ID: "tasks.findById",
        UPDATE: "tasks.update",
        REMOVE: "tasks.remove",
        COMMENT_CREATE: "tasks.comment.create",
        COMMENT_FIND_ALL: "tasks.comment.findAll",
      }),
    );

    expect(TASK_EVENT_PATTERNS.CREATED).toBe("task.created");
    expect(TASK_FORWARDING_PATTERNS.UPDATED).toBe("tasks.updated");
  });

  it("exposes microservice client tokens", () => {
    expect(TASKS_RPC_CLIENT).toBe("TASKS_RPC_CLIENT");
    expect(TASKS_EVENTS_CLIENT).toBe("TASKS_EVENTS_CLIENT");
    expect(NOTIFICATIONS_GATEWAY_CLIENT).toBe("NOTIFICATIONS_GATEWAY_CLIENT");
  });
});
