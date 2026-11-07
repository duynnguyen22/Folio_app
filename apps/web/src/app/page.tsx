import { BookOpenIcon } from 'lucide-react';
import { redirect } from 'next/navigation';
import { LogoutButton } from '@/components/logout-button';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Separator } from '@/components/ui/separator';
import { getCurrentUser } from '@/lib/api';

export default async function RoomPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/session-expired');

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col gap-12 px-4 py-6 sm:px-8">
      <header className="flex items-center justify-between gap-4">
        <div className="font-heading text-3xl font-semibold">
          Fol<em className="text-brass">io</em>
        </div>
        <LogoutButton />
      </header>

      <p className="font-heading text-4xl sm:text-5xl">Good to see you, {user.displayName}.</p>

      <section aria-labelledby="shelf-heading" className="flex flex-col gap-4">
        <h2 id="shelf-heading" className="font-heading text-2xl font-semibold">
          Your shelf
        </h2>
        <Separator />
        <Empty className="border bg-card py-12">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BookOpenIcon />
            </EmptyMedia>
            <EmptyTitle className="font-heading text-lg">Your shelf is empty</EmptyTitle>
            <EmptyDescription>Book uploads arrive in the next phase.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </section>
    </main>
  );
}
