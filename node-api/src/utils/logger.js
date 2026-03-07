/**
 * NovelGrab – Pino Logger
 *
 * Structured JSON logging in production, pretty-printed in dev.
 * Pattern from nodejs-backend-patterns skill.
 */

import pino from "pino";
import config from "../config/index.js";

export const logger = pino({
  level: config.isDev ? "debug" : "info",
  transport: config.isDev
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:standard",
          ignore: "pid,hostname",
        },
      }
    : undefined,
  // Production: structured JSON to stdout
  serializers: {
    err: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
  },
});
