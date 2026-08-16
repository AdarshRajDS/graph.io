export type SurfaceSampler = (x: number, y: number) => number;

export type SurfaceMesh = {
  positions: number[];
  colors: number[];
  indices: number[];
  samples: Array<{ x: number; y: number; z: number }>;
};

const ACCENT = { r: 0.48, g: 0.28, b: 0.16 };

function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}

function finiteOrZero(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

export function sampleExplicitSurface(
  sampler: SurfaceSampler,
  domain: readonly [number, number],
  resolution = 24,
): SurfaceMesh {
  const steps = Math.max(2, Math.min(48, Math.floor(resolution)));
  const [lo, hi] = domain;
  const positions: number[] = [];
  const colors: number[] = [];
  const samples: Array<{ x: number; y: number; z: number }> = [];
  let zMin = Infinity;
  let zMax = -Infinity;

  for (let j = 0; j <= steps; j += 1) {
    const y = lerp(lo, hi, j / steps);
    for (let i = 0; i <= steps; i += 1) {
      const x = lerp(lo, hi, i / steps);
      const z = finiteOrZero(sampler(x, y));
      samples.push({ x, y, z });
      positions.push(x, z, y);
      zMin = Math.min(zMin, z);
      zMax = Math.max(zMax, z);
    }
  }

  const span = zMax - zMin || 1;
  for (const sample of samples) {
    const t = (sample.z - zMin) / span;
    colors.push(ACCENT.r + 0.35 * t, ACCENT.g + 0.2 * t, ACCENT.b + 0.05 * t);
  }

  const indices: number[] = [];
  const stride = steps + 1;
  for (let j = 0; j < steps; j += 1) {
    for (let i = 0; i < steps; i += 1) {
      const a = j * stride + i;
      const b = a + 1;
      const c = a + stride;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }

  return { positions, colors, indices, samples };
}
