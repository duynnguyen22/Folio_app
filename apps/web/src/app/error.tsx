'use client';

import { Button } from '@/components/ui/button';

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 text-center">
      <p className="font-heading text-3xl">Folio can&apos;t reach its library right now.</p>
      <Button type="button" size="lg" onClick={reset} className="min-h-11">
        Try again
      </Button>
    </main>
  );
}
