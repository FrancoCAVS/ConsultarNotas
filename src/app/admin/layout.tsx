
import type { ReactNode } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { logoutAdmin } from '@/lib/actions';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

export const runtime = 'edge'

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const cookieStore = cookies();
  const authCookie = cookieStore.get('admin-auth');

  if (!authCookie || authCookie.value !== 'true') {
    redirect('/login');
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header id="admin-panel-header" className="bg-card border-b sticky top-0 z-40">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-primary">Panel de Administración</h1>
          <form action={logoutAdmin}>
            <Button variant="outline" size="sm" type="submit">
              <LogOut className="mr-2 h-4 w-4" />
              Cerrar Sesión
            </Button>
          </form>
        </div>
      </header>
      <main className="flex-grow container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}
