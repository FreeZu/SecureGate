"use client";

import { signOut } from "next-auth/react";
import { Button } from "./ui/Button";

// signOut is a client-side function. Always invoked from a Client Component
// (nextauth-integration §11). Redirects to /login after clearing the cookie.

export function LogoutButton() {
  return (
    <Button onClick={() => signOut({ callbackUrl: "/login" })}>Log out</Button>
  );
}
