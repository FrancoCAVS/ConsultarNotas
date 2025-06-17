
// This page is now wrapped by AdminLayout, which handles authentication.
// It can assume it's only rendered if the user is authenticated.

import StudentsTable from '@/components/admin/students-table';
import VisibilitySettingsForm from '@/components/admin/visibility-settings-form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Eye } from 'lucide-react';

export default function AdminPage() {
  return (
    <div className="space-y-8">
      {/* The main title for the admin page is now in AdminLayout */}
      {/* You can add specific page titles or keep it minimal here */}
      
      <Card className="shadow-lg no-print">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold flex items-center">
            <Eye className="mr-2 h-6 w-6 text-primary" />
            Gestión de Visualización para Alumnos
          </CardTitle>
          <CardDescription className="text-md text-muted-foreground">
            Controla qué campos pueden ver los alumnos al consultar sus notas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <VisibilitySettingsForm />
        </CardContent>
      </Card>

      <Separator className="no-print" />

      <Card className="shadow-lg students-table-print-card">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold">
            Gestión de Alumnos
          </CardTitle>
          <CardDescription className="text-md text-muted-foreground">
            Administra los registros de los alumnos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <StudentsTable />
        </CardContent>
      </Card>
    </div>
  );
}
