
'use client';

import { useState, useEffect, useTransition } from 'react';
import type { VisibilitySetting } from '@/lib/types';
import { getVisibilitySettings, updateVisibilitySetting } from '@/lib/actions';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertCircle, Save } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

// Define the fields that are manageable for visibility by students.
// The `key` must correspond to a field in StudentPartialGradeInfo or special handled fields.
// Labels should match the ones in the initial SQL for admin_visibility_settings.
const manageableStudentFields: Array<Omit<VisibilitySetting, 'is_visible' | 'updated_at'>> = [
  { field_name: 'studentName', label: 'Nombre Completo del Alumno' },
  { field_name: 'dni', label: 'DNI del Alumno' },
  { field_name: 'subject', label: 'Materia Cursada' },
  { field_name: 'partialGrade', label: 'Nota Parcial' },
  { field_name: 'recuperatorio', label: 'Nota Recuperatorio' },
  { field_name: 'porcentaje_asistencia', label: 'Porcentaje de Asistencia' },
  { field_name: 'porcentaje_tp_aprobados', label: 'Porcentaje de TP Aprobados' },
  { field_name: 'diario_clase', label: 'Estado del Diario de Clase' },
  { field_name: 'condicion', label: 'Condición Final' },
];

export default function VisibilitySettingsForm() {
  const [settings, setSettings] = useState<Record<string, boolean>>({});
  const [initialSettings, setInitialSettings] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  useEffect(() => {
    async function fetchSettings() {
      setLoading(true);
      setError(null);
      const result = await getVisibilitySettings();
      if (result.error) {
        let userFriendlyError = result.error;
        if (result.error.toLowerCase().includes("does not exist")) {
            userFriendlyError = "Error crítico: La tabla 'admin_visibility_settings' no existe en la base de datos. Por favor, créela y popúlela como se indica en la documentación.";
        }
        setError(userFriendlyError);
        toast({ variant: "destructive", title: "Error al Cargar Configuración", description: userFriendlyError, duration: 10000 });
        
        const defaultSettings: Record<string, boolean> = {};
        manageableStudentFields.forEach(field => defaultSettings[field.field_name] = true); 
        setSettings(defaultSettings);
        setInitialSettings(defaultSettings);
      } else if (result.data) {
        const fetchedSettingsMap: Record<string, boolean> = {};
        manageableStudentFields.forEach(managedField => {
          const foundSetting = result.data.find(s => s.field_name === managedField.field_name);
          // Default to true (visible) if a field from manageableStudentFields is not found in the DB
          // This handles cases where new manageable fields are added to the frontend
          // before their corresponding rows are added to the DB (though initial SQL should cover this).
          fetchedSettingsMap[managedField.field_name] = foundSetting ? foundSetting.is_visible : true; 
        });
        setSettings(fetchedSettingsMap);
        setInitialSettings(fetchedSettingsMap);
      }
      setLoading(false);
    }
    fetchSettings();
  }, [toast]);

  const handleToggle = (fieldName: string) => {
    setSettings(prev => ({
      ...prev,
      [fieldName]: !prev[fieldName],
    }));
  };

  const handleSaveChanges = async () => {
    setError(null); // Clear previous errors specific to this form action
    let changesMade = 0;
    let currentErrors: string[] = [];

    startTransition(async () => {
      for (const field of manageableStudentFields) {
        const fieldName = field.field_name;
        // Check if the setting has actually changed
        if (settings[fieldName] !== initialSettings[fieldName]) {
          changesMade++;
          const result = await updateVisibilitySetting(fieldName, settings[fieldName]);
          if (result.error) {
            currentErrors.push(`Error al guardar '${field.label}': ${result.error}`);
          }
        }
      }

      if (currentErrors.length > 0) {
        const fullErrorMessage = currentErrors.join('; ');
        setError(fullErrorMessage); // Set local error state for the Alert component
        toast({
          variant: "destructive",
          title: "Error al Guardar Cambios",
          description: fullErrorMessage,
          duration: 10000,
        });
      } else if (changesMade > 0) {
        toast({
          title: "Configuración Guardada",
          description: "Los cambios en la visibilidad han sido guardados.",
        });
        setInitialSettings({...settings}); 
      } else {
         toast({
          title: "Sin Cambios",
          description: "No se detectaron cambios para guardar.",
        });
      }
    });
  };

  if (loading) {
    return (
      <div className="flex items-center space-x-2">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <span>Cargando configuración de visibilidad...</span>
      </div>
    );
  }

  // This error display is for critical load failures (e.g., table doesn't exist)
  if (error && Object.keys(settings).every(key => settings[key] === true && initialSettings[key] === true) && error.toLowerCase().includes("does not exist")) { 
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error Crítico de Configuración</AlertTitle>
        <AlertDescription>{error}. La funcionalidad de visibilidad no operará correctamente hasta que esto sea resuelto. Por favor, recargue la página después de crear la tabla.</AlertDescription>
      </Alert>
    );
  }


  return (
    <div className="space-y-6">
      {/* This error display is for partial save failures */}
      {error && !error.toLowerCase().includes("does not exist") && !loading && (
         <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error Parcial al Guardar</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
        {manageableStudentFields.map((field) => (
          <div key={field.field_name} className="flex items-center space-x-2 p-2 border rounded-md hover:bg-muted/50 transition-colors">
            <Checkbox
              id={`visibility-${field.field_name}`}
              checked={settings[field.field_name] ?? true} 
              onCheckedChange={() => handleToggle(field.field_name)}
              disabled={isPending || loading}
              aria-label={`Visibilidad de ${field.label}`}
            />
            <Label htmlFor={`visibility-${field.field_name}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-grow">
              {field.label}
            </Label>
          </div>
        ))}
      </div>
      <Button onClick={handleSaveChanges} disabled={isPending || loading} className="mt-4">
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : (
          <Save className="h-4 w-4 mr-2" />
        )}
        Guardar Cambios
      </Button>
       <p className="text-sm text-muted-foreground mt-2">
        Los cambios se aplicarán la próxima vez que un alumno consulte sus notas.
        Asegúrate de que la tabla `admin_visibility_settings` exista en tu base de datos Supabase y esté poblada inicialmente con todos los campos gestionables.
      </p>
    </div>
  );
}

