import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(__dirname, "../../../../../.env") });

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin as adminPlugin } from "better-auth/plugins";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import * as bcrypt from "bcrypt";
import { ac, superAdmin, admin, dealer, user } from "./permissions";
import { AUTH_EVENTS } from "@shared/events/event-constants";

let nestjsEventEmitter: { emit: (event: string, payload: unknown) => boolean } | null = null;

export function setAuthEventEmitter(emitter: { emit: (event: string, payload: unknown) => boolean }) {
  nestjsEventEmitter = emitter;
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export const auth = betterAuth({
  baseURL: process.env.API_URL || "http://localhost:3001",
  basePath: "/api/auth",
  trustedOrigins: [
    process.env.WEB_URL || "http://localhost:3005",
    "https://www.verdeum.in",
    "https://verdeum.in",
  ],
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    password: {
      hash: async (password) => bcrypt.hash(password, 10),
      verify: async ({ hash, password }) => bcrypt.compare(password, hash),
    },
    sendResetPassword: async ({ user: resetUser, url }) => {
      console.log(`[AUTH] Password reset requested for ${resetUser.email}`);

      if (nestjsEventEmitter) {
        nestjsEventEmitter.emit(AUTH_EVENTS.PASSWORD_RESET_REQUESTED, {
          user: {
            id: resetUser.id,
            name: resetUser.name,
            email: resetUser.email,
          },
          url,
          occurredAt: new Date(),
        });
      } else {
        console.warn('[AUTH] NestJS EventEmitter not yet initialized, skipping password reset email');
      }
    },
  },
  user: {
    additionalFields: {
      role: {
        type: ["super_admin", "admin", "dealer", "user"],
        required: false,
        defaultValue: "user",
        input: false,
      },
      banned: {
        type: "boolean",
        required: false,
        defaultValue: false,
      },
      banReason: {
        type: "string",
        required: false,
      },
      banExpires: {
        type: "date",
        required: false,
      },
    },
  },
  plugins: [
    adminPlugin({
      ac,
      roles: {
        super_admin: superAdmin,
        admin,
        dealer,
        user,
      },
      adminRoles: ["admin", "super_admin"],
      defaultRole: "user",
    }),
  ],
});

