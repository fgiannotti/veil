export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { getEnv, assertProdEnv } = await import("./server/env");
    getEnv();
    assertProdEnv();
  }
}
