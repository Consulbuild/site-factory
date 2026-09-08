// Avvio del server Next (dev e start): unico gancio «una volta per processo».
// Solo runtime Node: il sweep usa fs, Keychain e wrangler.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { avviaSweepDemo } = await import("./lib/demo-sweep");
  avviaSweepDemo();
}
