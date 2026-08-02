import cors from "cors";
import type { RequestHandler } from "express";
import helmet from "helmet";
import { AppError } from "../../../application/errors/AppError.js";

export function securityHeadersMiddleware(): RequestHandler {
  return helmet({
    contentSecurityPolicy: { useDefaults: true },
    crossOriginResourcePolicy: { policy: "same-site" },
  });
}

export function corsMiddleware(allowedOriginsCsv: string): RequestHandler {
  const allowedOrigins = allowedOriginsCsv
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return cors({
    origin(origin, callback) {
      // Sem header Origin (same-origin, server-to-server, curl) -> sempre permitido.
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new AppError("FORBIDDEN", "Origin não permitida por CORS", { origin }));
    },
    credentials: true,
  });
}
