"use server";

import { cookies } from "next/headers";

interface User {
  id: string;
  name: string;
  email: string;
}

export async function handleLogin(
  user: User,
  accessToken: string,
  rolesOrMeta?: any,
) {
  const isLocal = process.env.NODE_ENV !== "production";
  const cookieOptions = {
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    sameSite: "lax" as const,
    secure: !isLocal,
    // For local dev, we don't set domain to avoid browser rejection of ".localhost"
    domain: isLocal ? undefined : undefined,
  };

  const cookieStore = await cookies();

  // Save user data
  cookieStore.set("session_user", JSON.stringify(user), cookieOptions);

  // Save access token (not httpOnly so client can read it directly for API requests)
  cookieStore.set("session_access_token", accessToken, {
    ...cookieOptions,
    httpOnly: false,
  });

  // Save roles or metadata if provided
  if (rolesOrMeta) {
    try {
      cookieStore.set(
        "session_roles",
        JSON.stringify(rolesOrMeta),
        cookieOptions,
      );
    } catch (e) {
      // swallow cookie serialization errors
    }
  }
}

export async function getAccessToken(): Promise<string | null> {
  return (await cookies()).get("session_access_token")?.value || null;
}

export async function getSessionUser(): Promise<User | null> {
  const user = (await cookies()).get("session_user")?.value;
  return user ? JSON.parse(user) : null;
}

export async function resetAuthCookies() {
  const cookieStore = await cookies();
  cookieStore.set("session_user", "", { maxAge: 0, path: "/" });
  cookieStore.set("session_access_token", "", { maxAge: 0, path: "/" });
  cookieStore.set("session_roles", "", { maxAge: 0, path: "/" });
  cookieStore.set("active_tenant_id", "", { maxAge: 0, path: "/" });
}

export async function setActiveTenantCookie(tenantId: string) {
  const cookieStore = await cookies();
  cookieStore.set("active_tenant_id", tenantId, {
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    sameSite: "lax",
  });
}
