import bcrypt from "bcrypt";
import jwt, { type JwtPayload } from "jsonwebtoken";
import type { NextFunction, Request, Response } from "express";
import { Role } from "@prisma/client";
import { authUserResponseSchema } from "@forecasthub/shared";
import { env } from "./env.js";
import { prisma } from "./prisma.js";

const COOKIE_NAME = "access_token";
const TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

type AuthClaims = JwtPayload & { userId: string; role: Role };

const readCookie = (request: Request, name: string) =>
  request.headers.cookie?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`))?.slice(name.length + 1);

export const createAccessToken = (claims: Omit<AuthClaims, keyof JwtPayload>) =>
  jwt.sign(claims, env.JWT_SECRET, { expiresIn: "7d" });

export const setAuthCookie = (response: Response, token: string) => {
  response.setHeader("Set-Cookie", `${COOKIE_NAME}=${token}; Max-Age=${TOKEN_MAX_AGE_MS / 1000}; Path=/; HttpOnly; SameSite=Lax${process.env.NODE_ENV === "production" ? "; Secure" : ""}`);
};

export const clearAuthCookie = (response: Response) => {
  response.setHeader("Set-Cookie", `${COOKIE_NAME}=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax${process.env.NODE_ENV === "production" ? "; Secure" : ""}`);
};

export type AuthenticatedRequest = Request & { auth?: AuthClaims };

export const requireAuth = (request: AuthenticatedRequest, response: Response, next: NextFunction) => {
  const token = readCookie(request, COOKIE_NAME);
  if (!token) {
    response.status(401).json({ error: { code: "UNAUTHENTICATED", message: "Authentication is required." } });
    return;
  }

  try {
    const claims = jwt.verify(token, env.JWT_SECRET) as AuthClaims;
    if (!claims.userId || !claims.role) throw new Error("Invalid auth claims");
    request.auth = claims;
    next();
  } catch {
    response.status(401).json({ error: { code: "UNAUTHENTICATED", message: "Authentication is required." } });
  }
};

export const publicUser = (user: { id: string; username: string; email: string; role: Role; balance: number }) =>
  authUserResponseSchema.parse(user);

export const hashPassword = (password: string) => bcrypt.hash(password, 12);
export const verifyPassword = (password: string, passwordHash: string) => bcrypt.compare(password, passwordHash);

export const registerUser = async (input: { username: string; email: string; password: string }) => {
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email: input.email }, { username: input.username }] },
    select: { id: true },
  });
  if (existing) {
    const error = new Error("An account with that email or username already exists.");
    error.name = "DUPLICATE_ACCOUNT";
    throw error;
  }

  return prisma.$transaction(async (transaction) => {
    const userCount = await transaction.user.count();
    const user = await transaction.user.create({
      data: {
        username: input.username,
        email: input.email,
        passwordHash: await hashPassword(input.password),
        role: userCount === 0 ? Role.ADMINISTRATOR : Role.USER,
        balance: 1000,
      },
    });
    await transaction.creditLedger.create({
      data: { userId: user.id, type: "STARTING", amount: 1000, reason: "Initial credits" },
    });
    return user;
  });
};

export const authenticateUser = async (identifier: string, password: string) => {
  const user = await prisma.user.findFirst({
    where: { OR: [{ email: identifier }, { username: identifier }] },
  });
  if (!user || !user.isActive || !(await verifyPassword(password, user.passwordHash))) return null;
  return user;
};
