import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements, adminAc } from "better-auth/plugins/admin/access";

const statement = {
  ...defaultStatements,
  catalog: ["create", "read", "update", "delete"],
  inventory: ["create", "read", "update", "delete"],
  pricing: ["create", "read", "update", "delete"],
  orders: ["create", "read", "update", "delete"],
} as const;

export const ac = createAccessControl(statement);

export const superAdmin = ac.newRole({
  ...adminAc.statements,
  user: ["impersonate-admins", ...adminAc.statements.user],
  catalog: ["create", "read", "update", "delete"],
  inventory: ["create", "read", "update", "delete"],
  pricing: ["create", "read", "update", "delete"],
  orders: ["create", "read", "update", "delete"],
});

export const admin = ac.newRole({
  ...adminAc.statements,
  catalog: ["create", "read", "update", "delete"],
  inventory: ["create", "read", "update", "delete"],
  pricing: ["create", "read", "update", "delete"],
  orders: ["create", "read", "update", "delete"],
});

export const dealer = ac.newRole({
  catalog: ["read"],
  pricing: ["read"],
  orders: ["create", "read"],
});

export const user = ac.newRole({
  catalog: ["read"],
  orders: ["create", "read"],
});

