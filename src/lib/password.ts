import bcrypt from "bcryptjs";
import { BCRYPT_ROUNDS } from "@/lib/constants";

// All password hashing goes through these wrappers so the BCRYPT_ROUNDS=12
// invariant lives in one place. Per security.md §1.

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
