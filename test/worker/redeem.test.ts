import { SELF, env } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
import { login, seedCode, seedPlayer } from "../helpers/fixtures";

const redeem = (code: string, cookie?: string) =>
  SELF.fetch("http://test/api/redeem", {
    method: "POST",
    headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) },
    body: JSON.stringify({ code }),
  });

describe("POST /api/redeem", () => {
  beforeEach(() => seedPlayer());

  it("resgata um código válido", async () => {
    await seedCode("VALID-CODE", "p1");
    const { cookie, userId } = await login("fan");
    const res = await redeem("valid-code", cookie);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ playerId: "p1" });
    const card = await env.DB.prepare("SELECT 1 FROM user_cards WHERE user_id = ? AND player_id = 'p1'").bind(userId).first();
    expect(card).not.toBeNull();
    expect(await env.DB.prepare("SELECT uses FROM redeem_codes WHERE code = 'VALID-CODE'").first("uses")).toBe(1);
  });

  it("devolve 404 para código esgotado", async () => {
    await seedCode("USED-CODE", "p1", { maxUses: 1, uses: 1 });
    const { cookie } = await login("fan");
    expect((await redeem("USED-CODE", cookie)).status).toBe(404);
  });

  it("devolve 404 fora da janela", async () => {
    const now = Math.floor(Date.now() / 1000);
    await seedCode("FUTURE-CODE", "p1", { startsAt: now + 3600 });
    await seedCode("EXPIRED-CODE", "p1", { expiresAt: now - 60 });
    const { cookie } = await login("fan");
    expect((await redeem("FUTURE-CODE", cookie)).status).toBe(404);
    expect((await redeem("EXPIRED-CODE", cookie)).status).toBe(404);
  });

  it("devolve 409 para carta já na coleção", async () => {
    await seedCode("MULTI-CODE", "p1", { maxUses: 5 });
    const { cookie } = await login("fan");
    expect((await redeem("MULTI-CODE", cookie)).status).toBe(200);
    expect((await redeem("MULTI-CODE", cookie)).status).toBe(409);
    expect(await env.DB.prepare("SELECT uses FROM redeem_codes WHERE code = 'MULTI-CODE'").first("uses")).toBe(1);
  });

  it("devolve 401 sem login", async () => {
    await seedCode("VALID-CODE", "p1");
    expect((await redeem("VALID-CODE")).status).toBe(401);
  });
});
