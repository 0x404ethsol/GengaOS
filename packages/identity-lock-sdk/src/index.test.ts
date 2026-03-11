import test from "node:test";
import assert from "node:assert/strict";
import { signIdentityLock, verifyIdentityLock } from "./index.js";

test("sign and verify identity lock", () => {
  const payload = {
    actorId: "actor_1",
    actorLockId: "lock_1",
    issuedAt: "2026-02-12T00:00:00.000Z",
    expiresAt: "2026-02-13T00:00:00.000Z"
  };

  const signature = signIdentityLock(payload, "secret");
  assert.equal(verifyIdentityLock(payload, signature, "secret"), true);
  assert.equal(verifyIdentityLock(payload, signature, "wrong"), false);
});