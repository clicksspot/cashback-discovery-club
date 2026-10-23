// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { assertAdmin } from "./admin-access";
import { encryptCredentials, decryptCredentials } from "./credential-encryption.server";

describe("confidential Impact credential storage", () => {
  const fixture = { sid: "test-account", token: "test-token-not-a-real-credential" };
  it("encrypts both credentials and reads them back only with the correct key", async () => {
    const payload = await encryptCredentials(fixture, "test-encryption-key-not-a-real-secret");
    expect(payload).not.toContain(fixture.sid);
    expect(payload).not.toContain(fixture.token);
    expect(await decryptCredentials(payload, "test-encryption-key-not-a-real-secret")).toEqual(fixture);
    await expect(decryptCredentials(payload, "different-test-key")).rejects.toThrow("could not be read");
  });
  it("rejects non-admins and role lookup errors", async () => {
    for (const result of [{ data: false, error: null }, { data: true, error: { message: "lookup failed" } }]) {
      const context = { supabase: { rpc: vi.fn().mockResolvedValue(result) }, userId: "test-user" };
      await expect(assertAdmin(context as unknown as Parameters<typeof assertAdmin>[0])).rejects.toThrow("Only admins");
    }
  });
  it("allows only a verified admin", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: true, error: null });
    await expect(assertAdmin({ supabase: { rpc }, userId: "test-admin" } as unknown as Parameters<typeof assertAdmin>[0])).resolves.toBeUndefined();
    expect(rpc).toHaveBeenCalledWith("has_role", { _user_id: "test-admin", _role: "admin" });
  });
});