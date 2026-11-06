import Link from 'next/link';
import type { ReactNode } from 'react';

export function AuthCard(props: {
  title: string;
  children: ReactNode;
  footer: { text: string; linkText: string; href: string };
}) {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-desk-2 p-8 shadow-2xl">
        <p className="font-display text-lg italic text-brass">Folio</p>
        <h1 className="mt-1 mb-6 font-display text-4xl font-semibold">{props.title}</h1>
        {props.children}
        <p className="mt-6 text-center text-sm text-text-dim">
          {props.footer.text}{' '}
          <Link
            href={props.footer.href}
            className="inline-flex min-h-11 items-center text-brass underline-offset-4 hover:underline"
          >
            {props.footer.linkText}
          </Link>
        </p>
      </div>
    </main>
  );
}
