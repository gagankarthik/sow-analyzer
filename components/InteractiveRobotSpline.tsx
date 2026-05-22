"use client";

import { Suspense, lazy, Component, useEffect, useState, type ReactNode } from "react";

const Spline = lazy(() => import("@splinetool/react-spline"));

interface InteractiveRobotSplineProps {
  scene: string;
  className?: string;
  /** Shown when WebGL is unavailable or the 3D runtime fails to start. */
  fallback?: ReactNode;
}

/** Catches WebGL/runtime errors from Spline so a failed 3D context never
 *  crashes the page — it falls back to a static visual instead. */
class SplineBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    /* swallowed on purpose — see fallback */
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function webglAvailable(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
    );
  } catch {
    return false;
  }
}

const Loader = ({ className }: { className?: string }) => (
  <div className={`flex h-full w-full items-center justify-center ${className ?? ""}`}>
    <svg className="h-6 w-6 animate-spin text-[var(--brand-primary-600)]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l2-2.647z" />
    </svg>
  </div>
);

/** On-brand static visual used when 3D isn't available. */
const FallbackOrb = ({ className }: { className?: string }) => (
  <div className={`relative flex items-center justify-center overflow-hidden ${className ?? ""}`} aria-hidden>
    <div
      className="absolute h-[68%] w-[68%] rounded-full blur-[64px]"
      style={{ background: "radial-gradient(circle, rgba(99,102,241,0.30), rgba(37,99,235,0.12) 52%, transparent 72%)" }}
    />
    <div
      className="relative h-48 w-48 rounded-full opacity-90"
      style={{ background: "conic-gradient(from 0deg, #2563EB, #8B5CF6, #6366F1, #2563EB)", animation: "conic-spin 22s linear infinite" }}
    />
    <div className="absolute h-40 w-40 rounded-full border border-white/50 bg-[var(--background)]/80 backdrop-blur-md" />
  </div>
);

export function InteractiveRobotSpline({ scene, className, fallback }: InteractiveRobotSplineProps) {
  // null = checking (don't render Spline during SSR or before the WebGL probe).
  const [supported, setSupported] = useState<boolean | null>(null);
  useEffect(() => {
    setSupported(webglAvailable()); // eslint-disable-line react-hooks/set-state-in-effect -- client-only capability probe
  }, []);

  const fb = fallback ?? <FallbackOrb className={className} />;

  if (supported === null) return <Loader className={className} />;
  if (supported === false) return <>{fb}</>;

  return (
    <SplineBoundary fallback={fb}>
      <Suspense fallback={<Loader className={className} />}>
        <Spline scene={scene} className={className} />
      </Suspense>
    </SplineBoundary>
  );
}
