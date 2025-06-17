
'use client';

import { useState, useTransition, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { fetchStudentPartialGrade } from '@/lib/actions';
import type { StudentPartialGradeInfo } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, Loader2, AlertCircle, RefreshCw, FileText, UserCircle, BookOpen, Percent, ClipboardList, CheckCircle2, Edit3 } from 'lucide-react';
import { Badge } from "@/components/ui/badge";

const formSchema = z.object({
  dni: z.string().min(5, 'El DNI debe tener al menos 5 caracteres.').max(15, 'El DNI no debe exceder los 15 caracteres.'),
  captcha: z.string().min(1, 'Por favor, resuelve el CAPTCHA.'),
});

// Helper function to determine badge variant for condition
function getCondicionBadgeVariant(condicion?: string | null): "default" | "secondary" | "destructive" | "outline" {
  if (!condicion) return "outline";
  switch (condicion.toLowerCase()) {
    case "promocionado":
    case "promocion": // Adding common variations
      return "default";
    case "regular":
      return "secondary";
    case "libre":
      return "destructive";
    default:
      return "outline";
  }
}


export default function GradesForm() {
  const [isPending, startTransition] = useTransition();
  const [fetchedGradeInfo, setFetchedGradeInfo] = useState<Partial<StudentPartialGradeInfo> | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [captchaError, setCaptchaError] = useState<string | null>(null);

  const [captchaNum1, setCaptchaNum1] = useState(0);
  const [captchaNum2, setCaptchaNum2] = useState(0);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      dni: '',
      captcha: '',
    },
  });

  const generateCaptchaNumbers = () => {
    setCaptchaNum1(Math.floor(Math.random() * 10) + 1);
    setCaptchaNum2(Math.floor(Math.random() * 10) + 1);
    form.setValue('captcha', '');
    setCaptchaError(null);
  };

  useEffect(() => {
    generateCaptchaNumbers();
  }, []);

  function onSubmit(values: z.infer<typeof formSchema>) {
    setQueryError(null);
    setFetchedGradeInfo(null);
    setCaptchaError(null);

    const expectedCaptchaAnswer = captchaNum1 + captchaNum2;
    if (parseInt(values.captcha, 10) !== expectedCaptchaAnswer) {
      setCaptchaError('Respuesta incorrecta. Intenta de nuevo.');
      generateCaptchaNumbers();
      form.setError("captcha", { type: "manual", message: "Respuesta incorrecta. Intenta de nuevo." });
      return;
    }

    startTransition(async () => {
      const result = await fetchStudentPartialGrade(values.dni);
      if (result.error) {
        setQueryError(result.error);
        setFetchedGradeInfo(null);
      } else if (result.data) {
        if (Object.keys(result.data).length === 0) {
            setQueryError(`No se encontraron datos visibles para el DNI: ${values.dni}. Contacte al administrador.`);
            setFetchedGradeInfo(null);
        } else {
            setFetchedGradeInfo(result.data);
            setQueryError(null);
        }
      } else {
         // Should not happen if action always returns data or error
         setQueryError(`No se encontraron datos para el DNI: ${values.dni}.`);
         setFetchedGradeInfo(null);
      }
      generateCaptchaNumbers();
    });
  }

  const hasVisibleData = fetchedGradeInfo && Object.values(fetchedGradeInfo).some(value => value !== null && value !== undefined);


  return (
    <Card className="w-full max-w-2xl mx-auto shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-headline text-center">Consultar Calificaciones</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="dni"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="dni-input">Número de DNI</FormLabel>
                  <FormControl>
                    <Input id="dni-input" placeholder="Ingrese su DNI" {...field} aria-label="Número de DNI" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="captcha"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="captcha-input">
                    Resuelve: ¿Cuánto es {captchaNum1} + {captchaNum2}?
                  </FormLabel>
                  <div className="flex gap-2 items-center">
                    <FormControl>
                      <Input id="captcha-input" type="number" placeholder="Tu respuesta" {...field} aria-label="Respuesta del CAPTCHA" />
                    </FormControl>
                    <Button type="button" variant="ghost" size="icon" onClick={generateCaptchaNumbers} aria-label="Generar nuevo CAPTCHA">
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                  {captchaError && <p className="text-sm font-medium text-destructive">{captchaError}</p>}
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={isPending} className="w-full sm:w-auto" aria-label="Buscar calificaciones">
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              <span className="ml-2">Buscar</span>
            </Button>
          </form>
        </Form>

        {queryError && (
          <Alert variant="destructive" className="mt-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error en la Consulta</AlertTitle>
            <AlertDescription>{queryError}</AlertDescription>
          </Alert>
        )}

        {fetchedGradeInfo && !queryError && hasVisibleData && (
          <Card className="mt-8 shadow-2xl bg-card">
            <CardHeader>
              <CardTitle className="text-xl font-headline flex items-center">
                <FileText className="mr-2 h-5 w-5 text-primary" />
                Detalle del Alumno
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-4">
              {fetchedGradeInfo.studentName && (
                <div className="flex items-center">
                  <UserCircle className="mr-2 h-5 w-5 text-muted-foreground" />
                  <p><span className="font-semibold">Alumno:</span> {fetchedGradeInfo.studentName}</p>
                </div>
              )}
              {fetchedGradeInfo.dni && (
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 h-5 w-5 text-muted-foreground"><path d="M10 21v-2a4 4 0 0 1 4-4v0a4 4 0 0 1 4 4v2"></path><path d="M14 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"></path><path d="M2 21v-2a4 4 0 0 1 4-4h0"></path><path d="M6 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"></path></svg>
                  <p><span className="font-semibold">DNI:</span> {fetchedGradeInfo.dni}</p>
                </div>
              )}
              {fetchedGradeInfo.subject && (
                <div className="flex items-center">
                  <BookOpen className="mr-2 h-5 w-5 text-muted-foreground" />
                  <p><span className="font-semibold">Materia:</span> {fetchedGradeInfo.subject}</p>
                </div>
              )}
              {fetchedGradeInfo.partialGrade !== undefined && fetchedGradeInfo.partialGrade !== null && (
                <div className="flex items-center">
                  <Edit3 className="mr-2 h-5 w-5 text-muted-foreground" />
                  <p><span className="font-semibold">Nota Parcial:</span> {fetchedGradeInfo.partialGrade ?? '-'}</p>
                </div>
              )}
              {fetchedGradeInfo.recuperatorio !== undefined && fetchedGradeInfo.recuperatorio !== null && (
                <div className="flex items-center">
                  <Edit3 className="mr-2 h-5 w-5 text-muted-foreground" />
                  <p><span className="font-semibold">Recuperatorio:</span> {fetchedGradeInfo.recuperatorio ?? '-'}</p>
                </div>
              )}
              {fetchedGradeInfo.porcentaje_asistencia !== undefined && fetchedGradeInfo.porcentaje_asistencia !== null && (
                <div className="flex items-center">
                  <Percent className="mr-2 h-5 w-5 text-muted-foreground" />
                  <p><span className="font-semibold">% Asistencia:</span> {fetchedGradeInfo.porcentaje_asistencia !== null ? `${fetchedGradeInfo.porcentaje_asistencia}%` : '-'}</p>
                </div>
              )}
              {fetchedGradeInfo.porcentaje_tp_aprobados !== undefined && fetchedGradeInfo.porcentaje_tp_aprobados !== null && (
                <div className="flex items-center">
                  <Percent className="mr-2 h-5 w-5 text-muted-foreground" />
                  <p><span className="font-semibold">% TP Aprobados:</span> {fetchedGradeInfo.porcentaje_tp_aprobados !== null ? `${fetchedGradeInfo.porcentaje_tp_aprobados}%` : '-'}</p>
                </div>
              )}
              {fetchedGradeInfo.diario_clase !== undefined && fetchedGradeInfo.diario_clase !== null && (
                <div className="flex items-center">
                  <ClipboardList className="mr-2 h-5 w-5 text-muted-foreground" />
                  <p><span className="font-semibold">Diario de Clase:</span> {fetchedGradeInfo.diario_clase ?? '-'}</p>
                </div>
              )}
              {fetchedGradeInfo.condicion && (
                <div className="flex items-center">
                  <CheckCircle2 className="mr-2 h-5 w-5 text-muted-foreground" />
                  <div className="flex items-center"><span className="font-semibold mr-1">Condición:</span>
                    <Badge variant={getCondicionBadgeVariant(fetchedGradeInfo.condicion)}>
                      {fetchedGradeInfo.condicion}
                    </Badge>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
         {fetchedGradeInfo && !queryError && !hasVisibleData && (
            <Alert variant="default" className="mt-6">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Información No Visible</AlertTitle>
                <AlertDescription>
                No hay campos configurados para ser visibles para este DNI en este momento.
                Si cree que esto es un error, contacte al administrador.
                </AlertDescription>
            </Alert>
        )}
      </CardContent>
    </Card>
  );
}
