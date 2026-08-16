export function contourPolylines(
  fn: (x: number, y: number) => number,
  domain: [number, number],
  steps = 32,
  level = 0,
): Array<Array<[number, number]>> {
  const [lo, hi] = domain;
  const step = (hi - lo) / steps;
  const lines: Array<Array<[number, number]>> = [];

  const interp = (ax: number, ay: number, av: number, bx: number, by: number, bv: number): [number, number] => {
    const t = (level - av) / (bv - av || 1);
    return [ax + t * (bx - ax), ay + t * (by - ay)];
  };

  for (let i = 0; i < steps; i += 1) {
    for (let j = 0; j < steps; j += 1) {
      const x0 = lo + i * step;
      const y0 = lo + j * step;
      const x1 = x0 + step;
      const y1 = y0 + step;
      const corners: Array<[number, number, number]> = [
        [x0, y0, fn(x0, y0)],
        [x1, y0, fn(x1, y0)],
        [x1, y1, fn(x1, y1)],
        [x0, y1, fn(x0, y1)],
      ];
      const hits: Array<[number, number]> = [];
      for (let e = 0; e < 4; e += 1) {
        const [ax, ay, av] = corners[e];
        const [bx, by, bv] = corners[(e + 1) % 4];
        if ((av - level) * (bv - level) <= 0 && av !== bv) {
          hits.push(interp(ax, ay, av, bx, by, bv));
        }
      }
      if (hits.length >= 2) {
        lines.push([hits[0], hits[1]]);
      }
    }
  }
  return lines;
}
