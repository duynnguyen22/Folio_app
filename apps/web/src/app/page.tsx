import { redirect } from 'next/navigation';
import { LogoutButton } from '@/components/logout-button';
import { getCurrentUser } from '@/lib/api';

export default async function RoomPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/session-expired');

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-4 py-6 sm:px-8">
      <header className="flex items-center justify-between gap-4">
        <div className="font-display text-3xl font-semibold">
          Fol<em className="text-brass">io</em>
        </div>
        <LogoutButton />
      </header>

      <p className="mt-12 font-display text-4xl sm:text-5xl">Good to see you, {user.displayName}.</p>

      <section aria-labelledby="shelf-heading" className="mt-12">
        <h2 id="shelf-heading" className="font-display text-2xl font-semibold text-text">
          Your shelf
        </h2>
        <div className="mt-4 rounded-2xl border border-dashed border-line bg-desk-2 px-6 py-12 text-center text-text-dim">
          Your shelf is empty. Book uploads arrive in the next phase.
        </div>
      </section>
    </main>
  );
}
