
'use client';

import Link from 'next/link';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Menu, BookOpenCheck } from 'lucide-react';

export default function AppHeader() {
  const navItems = [
    { href: '/', label: 'Consultar Notas' },
    // { href: '/admin', label: 'Administración' }, // Removed admin link
  ];

  return (
    <header 
      data-main-header 
      className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
    >
      <div className="container flex h-14 items-center">
        <Link href="/" className="mr-6 flex items-center space-x-2">
          <BookOpenCheck className="h-6 w-6 text-primary" />
          <span className="font-bold sm:inline-block">
            MiNotaEdu
          </span>
        </Link>
        
        <nav className="hidden md:flex flex-1 items-center space-x-4">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              {item.label}
            </Link>
          ))}
           {/* Link to Login page for admin access */}
          <Link
            href="/login"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
          >
            Admin Login
          </Link>
        </nav>

        <div className="flex flex-1 items-center justify-end space-x-4 md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Abrir menú</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <nav className="grid gap-6 text-lg font-medium mt-6">
                <Link href="/" className="flex items-center space-x-2 mb-4">
                  <BookOpenCheck className="h-6 w-6 text-primary" />
                  <span className="font-bold">MiNotaEdu</span>
                </Link>
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="text-muted-foreground hover:text-primary"
                  >
                    {item.label}
                  </Link>
                ))}
                 <Link
                    href="/login"
                    className="text-muted-foreground hover:text-primary"
                  >
                    Admin Login
                  </Link>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
