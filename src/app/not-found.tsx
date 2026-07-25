import Link from "next/link";

export default function NotFound() {
  return (
    <div className="page-shell-mesh flex min-h-screen flex-col items-center justify-center p-12">
      {/* Ambient glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[var(--color-violet)]/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="glass-card relative z-10 flex flex-col items-center p-12 text-center max-w-md">
        <h2
          className="text-gradient text-7xl font-bold mb-4"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          404
        </h2>
        <p className="text-lg text-[var(--color-ink-dim)] mb-2" style={{ fontFamily: "var(--font-heading)" }}>
          Page Not Found
        </p>
        <p className="text-sm text-[var(--color-ink-muted)] mb-8">
          Could not find the requested resource.
        </p>
        <Link
          href="/"
          className="rounded-full bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-violet)] px-8 py-2.5 text-sm font-semibold text-black transition-all hover:shadow-[0_0_30px_var(--color-accent-glow)]"
        >
          Return Home
        </Link>
      </div>
    </div>
  );
}
