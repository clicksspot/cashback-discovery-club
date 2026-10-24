// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { assertAdmin } from "./admin-access";
import { encryptCredentials, decryptCredentials } from "./credential-encryption.server";
import { saveImpactCredentials } from "./impact.server";

const { upsert, from } = vi.hoisted(() => {
  const upsert = vi.fn();
  return { upsert, from: vi.fn(() => ({ upsert })) };
});
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: { from } }));
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.clearAllMocks(); });

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
  it("stores only encrypted credentials after Impact accepts them", async () => {
    vi.stubEnv("IMPACT_CREDENTIAL_ENCRYPTION_KEY", "test-encryption-key-not-a-real-secret");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 200 })));
    upsert.mockResolvedValue({ error: null });
    await saveImpactCredentials(fixture, "test-admin");
    expect(from).toHaveBeenCalledWith("integration_credentials");
    const row = upsert.mock.calls[0]?.[0];
    expect(row.provider).toBe("impact");
    expect(row.updated_by).toBe("test-admin");
    expect(await decryptCredentials(row.encrypted_credentials, "test-encryption-key-not-a-real-secret")).toEqual(fixture);
    expect(JSON.stringify(row)).not.toContain(fixture.token);
  });
  it("keeps the saved connection unchanged when Impact rejects replacement credentials", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("untrusted provider response", { status: 401 })));
    await expect(saveImpactCredentials(fixture, "test-admin")).rejects.toThrow("Impact rejected");
    expect(upsert).not.toHaveBeenCalled();
  });
  it("retries a transient network failure before saving verified credentials", async () => {
    vi.stubEnv("IMPACT_CREDENTIAL_ENCRYPTION_KEY", "test-encryption-key-not-a-real-secret");
    const fetchMock = vi.fn().mockRejectedValueOnce(new TypeError("fetch failed")).mockResolvedValueOnce(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    upsert.mockResolvedValue({ error: null });
    await saveImpactCredentials(fixture, "test-admin");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(upsert).toHaveBeenCalledTimes(1);
  });
  it("follows an Impact same-origin redirect before verification", async () => {
    vi.stubEnv("IMPACT_CREDENTIAL_ENCRYPTION_KEY", "test-encryption-key-not-a-real-secret");
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response(null, { status: 302, headers: { Location: "/Mediapartners/test-account/Campaigns/?PageSize=1" } })).mockResolvedValueOnce(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    upsert.mockResolvedValue({ error: null });
    await saveImpactCredentials(fixture, "test-admin");
    expect(fetchMock.mock.calls[1]?.[0]).toBe("https://api.impact.com/Mediapartners/test-account/Campaigns/?PageSize=1");
    expect(fetchMock.mock.calls[0]?.[1].redirect).toBe("manual");
    expect(upsert).toHaveBeenCalledTimes(1);
  });
  it("never forwards credentials to another origin or saves them after an unsafe redirect", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 302, headers: { Location: "https://untrusted.example/collect" } }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(saveImpactCredentials(fixture, "test-admin")).rejects.toThrow("Invalid Impact API destination");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(upsert).not.toHaveBeenCalled();
  });
  it("preserves saved credentials and hides provider details after repeated network failures", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError("private provider detail"));
    vi.stubGlobal("fetch", fetchMock);
    await expect(saveImpactCredentials(fixture, "test-admin")).rejects.toThrow("after retrying");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(upsert).not.toHaveBeenCalled();
  });
});