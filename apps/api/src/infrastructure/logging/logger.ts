import pino, { type Logger as PinoInstance } from "pino";
import type { ILogger } from "../../application/ports/ILogger.js";
import type { Env } from "../../shared/config/env.js";

class PinoLogger implements ILogger {
  constructor(private readonly instance: PinoInstance) {}

  info(message: string, meta: Record<string, unknown> = {}): void {
    this.instance.info(meta, message);
  }

  warn(message: string, meta: Record<string, unknown> = {}): void {
    this.instance.warn(meta, message);
  }

  error(message: string, meta: Record<string, unknown> = {}): void {
    this.instance.error(meta, message);
  }

  debug(message: string, meta: Record<string, unknown> = {}): void {
    this.instance.debug(meta, message);
  }
}

export function createLogger(env: Env): ILogger {
  const instance = pino({
    level: env.LOG_LEVEL,
    redact: {
      paths: [
        "password",
        "*.password",
        "token",
        "*.token",
        "authorization",
        "req.headers.authorization",
      ],
      remove: true,
    },
    ...(env.NODE_ENV === "development"
      ? { transport: { target: "pino-pretty", options: { colorize: true } } }
      : {}),
  });

  return new PinoLogger(instance);
}
