import Link from 'next/link';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export function AuthCard(props: {
  title: string;
  children: ReactNode;
  footer: { text: string; linkText: string; href: string };
}) {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-12">
      <Card className="w-full max-w-sm shadow-2xl [--card-spacing:--spacing(6)]">
        <CardHeader>
          <CardDescription className="font-heading text-lg italic text-brass">
            Folio
          </CardDescription>
          <CardTitle className="text-4xl font-semibold">
            <h1>{props.title}</h1>
          </CardTitle>
        </CardHeader>
        <CardContent>{props.children}</CardContent>
        <CardFooter className="justify-center gap-1 text-sm text-muted-foreground">
          {props.footer.text}
          <Button
            variant="link"
            className="min-h-11 px-1"
            render={<Link href={props.footer.href} />}
          >
            {props.footer.linkText}
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
}
