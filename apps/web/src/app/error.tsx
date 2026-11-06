'use client';

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 text-center">
      <p className="font-display text-3xl">Folio can&apos;t reach its library right now.</p>
      <button
        type="button"
        onClick={reset}
        className="min-h-11 rounded-full bg-brass px-6 font-semibold text-[var(--brass-ink)] hover:bg-brass-hi"
      >
        Try again
      </button>
    </main>
  );
}
