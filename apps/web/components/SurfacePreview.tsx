"use client";

import { Coordinates, Mafs, Polyline } from "mafs";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  compileExpression,
  sampleExplicitSurface,
  type SurfaceSpec,
} from "@math-vis/visualization-schema";

import { contourPolylines } from "@/lib/contour";
import { hasWebGL } from "@/lib/webgl";

const ACCENT = "var(--color-accent)";

type Props = {
  spec: SurfaceSpec;
  phase: number;
  viewKey: number;
};

export function SurfacePreview({ spec, phase, viewKey }: Props) {
  const [webgl, setWebgl] = useState<boolean | null>(null);
  useEffect(() => {
    setWebgl(hasWebGL());
  }, []);
  if (webgl === null) {
    return (
      <div className="canvas-wrap">
        <div className="canvas-stage" />
      </div>
    );
  }
  if (!webgl) {
    return <ContourFallback spec={spec} phase={phase} viewKey={viewKey} />;
  }
  return <SurfaceCanvas spec={spec} phase={phase} />;
}

function ContourFallback({ spec, phase, viewKey }: Props) {
  const fn = compileExpression(spec.expression, ["x", "y", ...Object.keys(spec.parameters)]);
  const levels = [-2, -1, 0, 1, 2];
  return (
    <div className="canvas-wrap">
      <div className="canvas-stage">
        <Mafs key={viewKey} viewBox={{ x: spec.domain, y: spec.domain }} zoom pan>
          <Coordinates.Cartesian subdivisions={2} />
          {levels.flatMap((level) =>
            contourPolylines((x, y) => fn({ x: x + phase, y, ...spec.parameters }), spec.domain, 28, level).map(
              (points, index) => (
                <Polyline key={`${level}-${index}`} points={points} color={ACCENT} weight={1.5} strokeOpacity={0.85} />
              ),
            ),
          )}
        </Mafs>
      </div>
    </div>
  );
}

function SurfaceCanvas({ spec, phase }: { spec: SurfaceSpec; phase: number }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const mesh = useMemo(() => {
    const fn = compileExpression(spec.expression, ["x", "y", ...Object.keys(spec.parameters)]);
    return sampleExplicitSurface((x, y) => fn({ x: x + phase, y, ...spec.parameters }), spec.domain, 24);
  }, [spec, phase]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return;
    }
    let cancelled = false;
    const runtime: { cleanup: () => void } = { cleanup: () => {} };
    void import("three").then(async (THREE) => {
      if (cancelled || !hostRef.current) {
        return;
      }
      const { OrbitControls } = await import("three/examples/jsm/controls/OrbitControls.js");
      if (cancelled || !hostRef.current) {
        return;
      }
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 200);
      camera.position.set(8, 7, 10);
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.Float32BufferAttribute(mesh.positions, 3));
      geometry.setAttribute("color", new THREE.Float32BufferAttribute(mesh.colors, 3));
      geometry.setIndex(mesh.indices);
      geometry.computeVertexNormals();
      const material = new THREE.MeshStandardMaterial({
        vertexColors: true,
        metalness: 0.05,
        roughness: 0.45,
        side: THREE.DoubleSide,
      });
      const surface = new THREE.Mesh(geometry, material);
      const light = new THREE.DirectionalLight(0xfff6e8, 1.2);
      light.position.set(4, 10, 6);
      scene.add(new THREE.AmbientLight(0xffffff, 0.45));
      scene.add(light);
      scene.add(new THREE.AxesHelper(4));
      scene.add(surface);
      renderer.domElement.className = "surface-gl";
      renderer.domElement.setAttribute("aria-label", "Interactive 3D surface");
      host.appendChild(renderer.domElement);

      const resize = () => {
        const width = host.clientWidth || 640;
        const height = host.clientHeight || 480;
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      };
      resize();
      const observer = new ResizeObserver(resize);
      observer.observe(host);
      let frame = 0;
      const tick = () => {
        controls.update();
        renderer.render(scene, camera);
        frame = window.requestAnimationFrame(tick);
      };
      frame = window.requestAnimationFrame(tick);
      runtime.cleanup = () => {
        window.cancelAnimationFrame(frame);
        observer.disconnect();
        controls.dispose();
        geometry.dispose();
        material.dispose();
        renderer.dispose();
        renderer.domElement.remove();
      };
    });
    return () => {
      cancelled = true;
      runtime.cleanup();
    };
  }, [mesh]);

  return (
    <div className="canvas-wrap">
      <div className="canvas-stage" ref={hostRef} />
    </div>
  );
}
