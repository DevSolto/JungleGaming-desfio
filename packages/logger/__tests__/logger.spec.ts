import { beforeEach, describe, expect, it } from "vitest";
import { Writable } from "node:stream";

import {
  AppLoggerService,
  createAppLogger,
  maskSensitiveFields,
  runWithRequestContext,
} from "../src";

type LoggedEntry = Record<string, unknown>;

type TestLoggerSetup = {
  logger: AppLoggerService;
  entries: LoggedEntry[];
};

const createLoggerWithMemoryStream = (): TestLoggerSetup => {
  const entries: LoggedEntry[] = [];

  const stream = new Writable({
    write(chunk, _encoding, callback) {
      const raw = chunk.toString("utf8").trim();

      if (raw.length > 0) {
        const lines = raw.split("\n");
        for (const line of lines) {
          if (line.trim().length === 0) {
            continue;
          }

          try {
            entries.push(JSON.parse(line));
          } catch {
            entries.push({ raw: line });
          }
        }
      }

      callback();
    },
  });

  const logger = createAppLogger({ destination: stream });

  return { logger, entries };
};

describe("maskSensitiveFields", () => {
  it("mascara campos sensíveis recursivamente sem mutar o input", () => {
    const payload = {
      password: "segredo",
      nested: {
        refreshToken: "token-refresh",
        list: [
          { token: "abc" },
          { value: "permanecer" },
        ],
      },
      headers: {
        authorization: "Bearer valor",
      },
    };

    const masked = maskSensitiveFields(payload);

    expect(masked).toEqual({
      password: "[REDACTED]",
      nested: {
        refreshToken: "[REDACTED]",
        list: [
          { token: "[REDACTED]" },
          { value: "permanecer" },
        ],
      },
      headers: {
        authorization: "[REDACTED]",
      },
    });

    expect(payload.nested.refreshToken).toBe("token-refresh");
    expect(payload.headers.authorization).toBe("Bearer valor");
  });
});

describe("createAppLogger", () => {
  let setup: TestLoggerSetup;

  beforeEach(() => {
    setup = createLoggerWithMemoryStream();
  });

  const flushAsync = async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  };

  it("enriquece logs com requestId e aplica redaction nos campos sensíveis", async () => {
    const { logger, entries } = setup;

    runWithRequestContext({ requestId: "req-123" }, () => {
      logger.log("login concluído", {
        password: "senha",
        data: {
          refreshToken: "refresh-valor",
          accessToken: "access-valor",
        },
        headers: {
          authorization: "Bearer token",
          cookie: "token=valor",
        },
      });
    });

    logger.instance.flush?.();
    await flushAsync();

    expect(entries.length).toBeGreaterThan(0);
    const [entry] = entries;

    expect(entry.requestId).toBe("req-123");
    expect(entry.password).toBe("[REDACTED]");

    const headers = entry.headers as Record<string, unknown> | undefined;
    expect(headers?.authorization).toBe("[REDACTED]");
    expect(headers?.cookie).toBe("[REDACTED]");

    const data = entry.data as Record<string, unknown> | undefined;
    expect(data?.refreshToken).toBe("[REDACTED]");
    expect(data?.accessToken).toBe("[REDACTED]");
  });
});
