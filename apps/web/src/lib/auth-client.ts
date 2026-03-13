import { createAuthClient } from "better-auth/react";
import { adminClient } from "better-auth/client/plugins";
import { ac, superAdmin, admin, dealer, user } from "./permissions";

export const authClient = createAuthClient({
  plugins: [
    adminClient({
      ac,
      roles: {
        super_admin: superAdmin,
        admin,
        dealer,
        user,
      },
    }),
  ],
});

