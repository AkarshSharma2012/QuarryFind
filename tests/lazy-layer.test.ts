import { describe, expect, it, vi } from "vitest";
import { lazyLayer } from "../web/src/lib/data/lazy.ts";
import type { DataLayer } from "../web/src/lib/data/types.ts";

function fakeLayer() {
  const offAuth = vi.fn();
  const layer = {
    mode: "supabase",
    calls: [] as string[],
    async getUser(this: { calls: string[] }) { this.calls.push("getUser"); return { id: "u1", email: "a@b.c" }; },
    async startSearch(type: string, q: string) { return `${type}:${q}`; },
    onAuthChange: vi.fn(() => offAuth),
  };
  return { layer: layer as unknown as DataLayer & { calls: string[] }, offAuth };
}

describe("lazyLayer", () => {
  it("knows its mode without loading, and is never mistaken for a promise", async () => {
    const load = vi.fn(async () => fakeLayer().layer);
    const d = lazyLayer("supabase", load);
    expect(d.mode).toBe("supabase");
    expect(await Promise.resolve(d)).toBe(d); // not thenable
    expect(load).not.toHaveBeenCalled();
  });

  it("loads once on first use, forwards arguments and keeps `this`", async () => {
    const { layer } = fakeLayer();
    const load = vi.fn(async () => layer);
    const d = lazyLayer("supabase", load);
    expect(await d.getUser()).toEqual({ id: "u1", email: "a@b.c" });
    expect(await d.startSearch("username", "jdoe", false)).toBe("username:jdoe");
    expect(load).toHaveBeenCalledTimes(1);
    expect(layer.calls).toEqual(["getUser"]);
  });

  it("subscribes after loading and unsubscribes through the returned function", async () => {
    const { layer, offAuth } = fakeLayer();
    const d = lazyLayer("supabase", async () => layer);
    const off = d.onAuthChange(() => {});
    await new Promise((r) => setTimeout(r, 0));
    expect(layer.onAuthChange).toHaveBeenCalledTimes(1);
    off();
    expect(offAuth).toHaveBeenCalledTimes(1);
  });

  it("never subscribes if unsubscribed before the layer finished loading", async () => {
    const { layer } = fakeLayer();
    let release!: () => void;
    const d = lazyLayer("supabase", () => new Promise((r) => { release = () => r(layer); }));
    const off = d.onAuthChange(() => {});
    off();
    release();
    await new Promise((r) => setTimeout(r, 0));
    expect(layer.onAuthChange).not.toHaveBeenCalled();
  });
});
