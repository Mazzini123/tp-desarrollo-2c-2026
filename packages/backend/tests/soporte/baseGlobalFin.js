export default async function terminar() {
  await globalThis.__REPLSET__?.stop();
}
