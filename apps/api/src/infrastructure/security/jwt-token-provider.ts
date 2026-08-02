import jwt from "jsonwebtoken";
import type { AccessTokenClaims, ITokenProvider } from "../../application/ports/ITokenProvider.js";
import type { Env } from "../../shared/config/env.js";

/**
 * Só o access token passa por JWT — o refresh token é opaco (ver ADR 0010).
 * Erros de verificação (expirado, assinatura violada, claims malformadas)
 * são propagados como `Error` simples — quem decide o significado HTTP
 * disso é a camada de apresentação (`authenticateMiddleware`), não aqui.
 */
export class JwtTokenProvider implements ITokenProvider {
  constructor(private readonly env: Env) {}

  signAccessToken(claims: AccessTokenClaims, expiresInSeconds: number): string {
    return jwt.sign(claims, this.env.JWT_ACCESS_SECRET, {
      expiresIn: expiresInSeconds,
      algorithm: "HS256",
    });
  }

  verifyAccessToken(token: string): AccessTokenClaims {
    const decoded = jwt.verify(token, this.env.JWT_ACCESS_SECRET, { algorithms: ["HS256"] });

    if (typeof decoded !== "object" || decoded === null) {
      throw new Error("Payload do access token não é um objeto");
    }

    const { sub, sid, roles } = decoded as Record<string, unknown>;

    if (typeof sub !== "string" || typeof sid !== "string" || !Array.isArray(roles)) {
      throw new Error("Claims do access token em formato inesperado");
    }

    return {
      sub,
      sid,
      roles: roles.filter((role): role is string => typeof role === "string"),
    };
  }
}
