import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { currentUser } from "../../src/auth";
import { login } from "../helpers/fixtures";

const me = (cookie: string) => currentUser(env, new Request("http://test/api/me", { headers: { cookie } }));

describe("currentUser().admin", () => {
  it("é admin com nome em ADMINS e primeira conta twitch", async () => {
    const { cookie } = await login("AdmVicli", ["twitch", "google"]);
    expect((await me(cookie))?.admin).toBe(true);
  });

  it("não é admin quando a primeira conta é google", async () => {
    const { cookie } = await login("admvicli", ["google", "twitch"]);
    expect((await me(cookie))?.admin).toBe(false);
  });

  it("não é admin com nome fora de ADMINS", async () => {
    const { cookie } = await login("fan");
    expect((await me(cookie))?.admin).toBe(false);
  });
});
