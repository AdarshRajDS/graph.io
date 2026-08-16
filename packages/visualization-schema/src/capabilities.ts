import capabilitiesJson from "./capabilities.json";
import { visualizationKinds, type VisualizationKind } from "./spec";

export type SupportLevel = "full" | "approximate" | "export-only" | "planned" | "excluded";

export type Capability = {
  type: VisualizationKind;
  support: SupportLevel;
  browser2D: boolean;
  browser3D: boolean;
  exportEngine: "manim-ce" | "manimgl";
  exportTarget: string;
  manimGlTarget: string;
  examples: string[];
};

const supportLevels = new Set<SupportLevel>(["full", "approximate", "export-only", "planned", "excluded"]);

function asCapability(value: (typeof capabilitiesJson.kinds)[number]): Capability {
  if (!visualizationKinds.includes(value.type as VisualizationKind)) {
    throw new Error(`Unknown capability type: ${value.type}`);
  }
  if (!supportLevels.has(value.support as SupportLevel)) {
    throw new Error(`Unknown support level: ${value.support}`);
  }
  return value as Capability;
}

export const CAPABILITIES: Capability[] = capabilitiesJson.kinds.map(asCapability);

export function capabilityFor(kind: VisualizationKind): Capability {
  const found = CAPABILITIES.find((item) => item.type === kind);
  if (!found) {
    throw new Error(`Missing capability registry entry for ${kind}`);
  }
  return found;
}

export function assertCapabilityCoverage(): void {
  for (const kind of visualizationKinds) {
    capabilityFor(kind);
  }
}
