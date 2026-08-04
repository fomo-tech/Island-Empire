/** Stable pseudo-random value used for deterministic world decoration. */
export function hash(n: number) {
  const x = Math.sin(n * 127.1) * 43758.5453;
  return x - Math.floor(x);
}
