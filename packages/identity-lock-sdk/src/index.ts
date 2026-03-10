import crypto from "node:crypto";

export interface SignLockInput {
  actorId: string;
  actorLockId: string;
  issuedAt: string;
  expiresAt: string;
}

export function signIdentityLock(input: SignLockInput, secret: string): string {
  const payload = `${input.actorId}.${input.actorLockId}.${input.issuedAt}.${input.expiresAt}`;
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

export function verifyIdentityLock(input: SignLockInput, signature: string, secret: string): boolean {
  const expected = signIdentityLock(input, secret);
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export function isExpired(expiresAtIso: string): boolean {
  return new Date(expiresAtIso).getTime() <= Date.now();
}