import { Suspense } from "react";

import { Visualizer } from "@/components/Visualizer";
import { loadEnv } from "@/lib/env";

export default function HomePage() {
  const env = loadEnv();
  return (
    <Suspense fallback={<main className="fallback">Setting the table…</main>}>
      <Visualizer apiBaseUrl={env.NEXT_PUBLIC_API_URL ?? ""} />
    </Suspense>
  );
}
