
'use client';

import { useState, useEffect, useMemo, useTransition } from 'react';
import type { AdminStudentData } from '@/lib/types';
import { supabase } from '@/lib/supabaseClient';
import { updateStudentAdminData, importStudentsFromCSV, createStudentAdminData, deleteStudentAdminData, deleteAllStudentsAdminData } from '@/lib/actions';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormMessage, FormLabel } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Loader2, AlertCircle, Edit, Search, ChevronLeft, ChevronRight, Upload, FileText, Trash2, UserPlus, ShieldAlert, Printer } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from "@/hooks/use-toast";
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const commonStudentFormFields = {
  apellidos: z.string().min(1, 'Apellidos son requeridos.'),
  nombres: z.string().min(1, 'Nombres son requeridos.'),
  materia: z.string().min(1, 'Materia es requerida.'),
  nota_parcial: z.string().nullable().optional(),
  recuperatorio: z.string().nullable().optional(),
  porcentaje_asistencia: z.coerce.number().gte(0).lte(100).nullable().optional(),
  porcentaje_tp_aprobados: z.coerce.number().gte(0).lte(100).nullable().optional(),
  diario_clase: z.string().nullable().optional(),
  condicion: z.string().min(1, 'Condición es requerida.'),
};

const editStudentFormSchema = z.object(commonStudentFormFields);
type EditStudentFormData = z.infer<typeof editStudentFormSchema>;

const createStudentFormSchema = z.object({
  dni: z.string().min(5, 'DNI es requerido y debe tener al menos 5 caracteres.').max(15, 'El DNI no debe exceder los 15 caracteres.'),
  ...commonStudentFormFields,
});
type CreateStudentFormData = z.infer<typeof createStudentFormSchema>;


function getCondicionBadgeVariant(condicion?: string | null): "default" | "secondary" | "destructive" | "outline" {
  if (!condicion) return "outline";
  switch (condicion.toLowerCase()) {
    case "promocionado":
      return "default";
    case "regular":
      return "secondary";
    case "libre":
      return "destructive";
    default:
      return "outline";
  }
}

const ITEMS_PER_PAGE = 10;

export default function StudentsTable() {
  const [students, setStudents] = useState<AdminStudentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dniFilter, setDniFilter] = useState('');
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<AdminStudentData | null>(null);

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingStudentDni, setDeletingStudentDni] = useState<string | null>(null);

  const [isDeleteAllDialogOpen, setIsDeleteAllDialogOpen] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const [isPrintingAll, setIsPrintingAll] = useState(false);

  const editForm = useForm<EditStudentFormData>({
    resolver: zodResolver(editStudentFormSchema),
    defaultValues: {
      apellidos: '',
      nombres: '',
      materia: '',
      nota_parcial: null,
      recuperatorio: null,
      porcentaje_asistencia: null,
      porcentaje_tp_aprobados: null,
      diario_clase: null,
      condicion: '',
    },
  });

  const createForm = useForm<CreateStudentFormData>({
    resolver: zodResolver(createStudentFormSchema),
    defaultValues: {
      dni: '',
      apellidos: '',
      nombres: '',
      materia: '',
      nota_parcial: null,
      recuperatorio: null,
      porcentaje_asistencia: null,
      porcentaje_tp_aprobados: null,
      diario_clase: null,
      condicion: '',
    },
  });

  async function fetchStudents() {
    setLoading(true);
    setError(null);
    try {
      const { data, error: supabaseError } = await supabase
        .from('estudiantes_admin')
        .select('*')
        .order('apellidos', { ascending: true });

      if (supabaseError) {
        console.error('Error fetching students from Supabase:', supabaseError);
        setError(`Error al cargar datos: ${supabaseError.message}`);
        setStudents([]);
      } else {
        setStudents(data || []);
      }
    } catch (err: any) {
      console.error('Unexpected error fetching students:', err);
      setError(`Error inesperado: ${err.message || 'Ocurrió un problema desconocido.'}`);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchStudents();
  }, []);

  const filteredStudents = useMemo(() => {
    if (!dniFilter) {
      return students;
    }
    return students.filter(student =>
      student.dni.toLowerCase().includes(dniFilter.toLowerCase())
    );
  }, [students, dniFilter]);

  useEffect(() => {
    setCurrentPage(1); 
  }, [dniFilter]);

  const totalPages = Math.ceil(filteredStudents.length / ITEMS_PER_PAGE);

  const currentStudentsToDisplay = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredStudents.slice(startIndex, endIndex);
  }, [filteredStudents, currentPage]);

  const goToNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  const goToPreviousPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleEdit = (student: AdminStudentData) => {
    setEditingStudent(student);
    editForm.reset({
      apellidos: student.apellidos,
      nombres: student.nombres,
      materia: student.materia,
      nota_parcial: student.nota_parcial?.toString() ?? null,
      recuperatorio: student.recuperatorio?.toString() ?? null,
      porcentaje_asistencia: student.porcentaje_asistencia ?? null,
      porcentaje_tp_aprobados: student.porcentaje_tp_aprobados ?? null,
      diario_clase: student.diario_clase ?? null,
      condicion: student.condicion,
    });
    setIsEditDialogOpen(true);
  };

  const onSubmitEdit = async (values: EditStudentFormData) => {
    if (!editingStudent) return;

    startTransition(async () => {
      const result = await updateStudentAdminData(editingStudent.dni, values);
      if (result.error) {
        toast({
          variant: "destructive",
          title: "Error al actualizar",
          description: result.error,
        });
      } else {
        toast({
          title: "Éxito",
          description: "Datos del alumno actualizados correctamente.",
        });
        setIsEditDialogOpen(false);
        setEditingStudent(null);
        await fetchStudents(); 
      }
    });
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
    } else {
      setSelectedFile(null);
    }
  };

  const handleImportCSV = async () => {
    if (!selectedFile) {
      toast({
        variant: "destructive",
        title: "Error de importación",
        description: "Por favor, selecciona un archivo CSV.",
      });
      return;
    }

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const csvText = event.target?.result as string;
      if (!csvText) {
        toast({ variant: "destructive", title: "Error", description: "No se pudo leer el archivo CSV." });
        setIsImporting(false);
        return;
      }

      const lines = csvText.split(/\r\n|\n/).filter(line => line.trim() !== '');
      if (lines.length < 2) {
         toast({ variant: "destructive", title: "Error de Formato", description: "El CSV debe tener una fila de encabezado y al menos una fila de datos." });
         setIsImporting(false);
         return;
      }
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const expectedHeaders = ['dni','apellidos','nombres','materia','nota_parcial','recuperatorio','porcentaje_asistencia','porcentaje_tp_aprobados','diario_clase','condicion'];
      
      const missingHeaders = expectedHeaders.filter(eh => !headers.includes(eh));
      if (missingHeaders.length > 0) {
          toast({
              variant: "destructive",
              title: "Error de Encabezado CSV",
              description: `Faltan las siguientes columnas en el CSV: ${missingHeaders.join(', ')}. El orden esperado es: ${expectedHeaders.join(', ')}`,
              duration: 10000,
          });
          setIsImporting(false);
          return;
      }

      const studentsFromCSV: AdminStudentData[] = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        const studentData: any = {};
        headers.forEach((header, index) => {
            const value = values[index] ? values[index].trim() : null;
            if (header === 'porcentaje_asistencia' || header === 'porcentaje_tp_aprobados') {
                studentData[header] = value ? parseInt(value, 10) : null;
            } else {
                studentData[header] = value;
            }
        });
        studentsFromCSV.push({
            dni: studentData.dni || '',
            apellidos: studentData.apellidos || '',
            nombres: studentData.nombres || '',
            materia: studentData.materia || 'Sin Asignar',
            nota_parcial: studentData.nota_parcial,
            recuperatorio: studentData.recuperatorio,
            porcentaje_asistencia: studentData.porcentaje_asistencia,
            porcentaje_tp_aprobados: studentData.porcentaje_tp_aprobados,
            diario_clase: studentData.diario_clase,
            condicion: studentData.condicion || 'Sin Condición',
        });
      }
      
      if (studentsFromCSV.length === 0) {
        toast({ variant: "destructive", title: "CSV Vacío", description: "No se encontraron datos de estudiantes en el archivo CSV." });
        setIsImporting(false);
        return;
      }

      startTransition(async () => {
        const result = await importStudentsFromCSV(studentsFromCSV);
        if (result.error) {
          toast({
            variant: "destructive",
            title: "Error en la importación",
            description: result.error,
            duration: 7000,
          });
        } else {
          let description = `${result.successCount} alumnos importados correctamente.`;
          if (result.skippedDuplicates && result.skippedDuplicates.length > 0) {
            description += ` Se omitieron ${result.skippedDuplicates.length} DNIs duplicados: ${result.skippedDuplicates.join(', ')}.`;
          }
          toast({
            title: "Importación Completada",
            description: description,
            duration: 10000,
          });
          await fetchStudents(); 
        }
        setIsImporting(false);
        setSelectedFile(null); 
        const fileInput = document.getElementById('csv-file-input') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      });
    };
    reader.onerror = () => {
      toast({ variant: "destructive", title: "Error", description: "No se pudo leer el archivo." });
      setIsImporting(false);
    };
    reader.readAsText(selectedFile);
  };

  const handleOpenCreateDialog = () => {
    createForm.reset(); 
    setIsCreateDialogOpen(true);
  };

  const onSubmitCreate = async (values: CreateStudentFormData) => {
    startTransition(async () => {
      const result = await createStudentAdminData(values);
      if (result.error) {
        toast({
          variant: "destructive",
          title: "Error al crear alumno",
          description: result.error,
        });
      } else {
        toast({
          title: "Éxito",
          description: "Alumno creado correctamente.",
        });
        setIsCreateDialogOpen(false);
        await fetchStudents();
      }
    });
  };

  const handleDelete = (dni: string) => {
    setDeletingStudentDni(dni);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingStudentDni) return;
    startTransition(async () => {
      const result = await deleteStudentAdminData(deletingStudentDni);
      if (result.error) {
        toast({
          variant: "destructive",
          title: "Error al eliminar",
          description: result.error,
        });
      } else {
        toast({
          title: "Éxito",
          description: "Alumno eliminado correctamente.",
        });
        await fetchStudents();
      }
      setIsDeleteDialogOpen(false);
      setDeletingStudentDni(null);
    });
  };

  const confirmDeleteAll = async () => {
    startTransition(async () => {
      const result = await deleteAllStudentsAdminData();
      if (result.error) {
        toast({
          variant: "destructive",
          title: "Error al eliminar todo",
          description: result.error,
        });
      } else {
        toast({
          title: "Éxito",
          description: "Todos los alumnos han sido eliminados correctamente.",
        });
        await fetchStudents(); 
      }
      setIsDeleteAllDialogOpen(false);
    });
  };

  const handlePrint = () => {
    setIsPrintingAll(true);
    setTimeout(() => {
      window.print();
    }, 100); // Delay to allow state update and re-render
  };

  useEffect(() => {
    const handleAfterPrint = () => {
      setIsPrintingAll(false);
    };
    window.addEventListener('afterprint', handleAfterPrint);
    return () => {
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, []);

  const studentsToRender = isPrintingAll ? filteredStudents : currentStudentsToDisplay;


  if (loading && students.length === 0) {
    return (
      <div className="flex justify-center items-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">Cargando datos de alumnos...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="my-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error de Carga</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
       <Card className="shadow-md no-print">
        <CardHeader>
          <CardTitle className="text-xl font-semibold flex items-center">
            <Upload className="mr-2 h-5 w-5 text-primary" />
            Importar Alumnos desde CSV
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="csv-file-input">Seleccionar archivo CSV</Label>
            <Input
              id="csv-file-input"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="mt-1"
              disabled={isImporting || isPending}
            />
            <p className="mt-1 text-sm text-muted-foreground">
              El CSV debe tener las columnas: dni, apellidos, nombres, materia, nota_parcial, recuperatorio, porcentaje_asistencia, porcentaje_tp_aprobados, diario_clase, condicion.
            </p>
          </div>
          <Button onClick={handleImportCSV} disabled={!selectedFile || isImporting || isPending}>
            {isImporting || isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <FileText className="h-4 w-4 mr-2" />
            )}
            Importar CSV
          </Button>
        </CardContent>
      </Card>

      <Separator className="no-print" />
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 no-print">
            <div className="flex items-center gap-2 w-full sm:w-auto">
            <Search className="h-5 w-5 text-muted-foreground" />
            <Input
                type="text"
                placeholder="Filtrar por DNI..."
                value={dniFilter}
                onChange={(e) => setDniFilter(e.target.value)}
                className="max-w-sm"
                disabled={isPending}
            />
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <Button onClick={handleOpenCreateDialog} disabled={isPending} className="w-full sm:w-auto">
                    <UserPlus className="mr-2 h-4 w-4" />
                    Crear Alumno
                </Button>
                 <Button 
                    variant="destructive" 
                    onClick={() => setIsDeleteAllDialogOpen(true)} 
                    disabled={isPending || students.length === 0} 
                    className="w-full sm:w-auto"
                >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Eliminar Todo
                </Button>
                 <Button onClick={handlePrint} disabled={isPending || loading} className="w-full sm:w-auto" variant="outline">
                    <Printer className="mr-2 h-4 w-4" />
                    Imprimir / Guardar Lista
                </Button>
            </div>
        </div>


      <ScrollArea className="rounded-md border shadow-md students-table-print-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[120px] font-semibold">DNI</TableHead>
              <TableHead className="font-semibold">Apellidos</TableHead>
              <TableHead className="font-semibold">Nombres</TableHead>
              <TableHead className="font-semibold">Materia</TableHead>
              <TableHead className="text-center font-semibold">Nota Parcial</TableHead>
              <TableHead className="text-center font-semibold">Recup.</TableHead>
              <TableHead className="text-center font-semibold">% Asistencia</TableHead>
              <TableHead className="text-center font-semibold">% TP Aprob.</TableHead>
              <TableHead className="font-semibold">Diario de Clase</TableHead>
              <TableHead className="text-center font-semibold">Condición</TableHead>
              <TableHead className="text-center font-semibold no-print">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(loading || (isPending && !isPrintingAll)) && students.length > 0 && (
                 <TableRow>
                    <TableCell colSpan={11} className="h-24 text-center">
                        <div className="flex justify-center items-center">
                            <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
                            Actualizando...
                        </div>
                    </TableCell>
                </TableRow>
            )}
            {!loading && !(isPending && !isPrintingAll) && studentsToRender.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="h-24 text-center">
                  No hay datos de alumnos para mostrar {dniFilter ? "con el filtro actual." : "."}
                </TableCell>
              </TableRow>
            ) : (
              studentsToRender.map((student) => (
                <TableRow key={student.dni}>
                  <TableCell className="font-medium">{student.dni}</TableCell>
                  <TableCell>{student.apellidos}</TableCell>
                  <TableCell>{student.nombres}</TableCell>
                  <TableCell>{student.materia}</TableCell>
                  <TableCell className="text-center">{student.nota_parcial ?? '-'}</TableCell>
                  <TableCell className="text-center">{student.recuperatorio ?? '-'}</TableCell>
                  <TableCell className="text-center">{student.porcentaje_asistencia !== null && student.porcentaje_asistencia !== undefined ? `${student.porcentaje_asistencia}%` : '-'}</TableCell>
                  <TableCell className="text-center">{student.porcentaje_tp_aprobados !== null && student.porcentaje_tp_aprobados !== undefined ? `${student.porcentaje_tp_aprobados}%` : '-'}</TableCell>
                  <TableCell>{student.diario_clase ?? '-'}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={getCondicionBadgeVariant(student.condicion)}>
                      {student.condicion}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center space-x-2 no-print">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(student)} disabled={isPending}>
                      <Edit className="h-4 w-4 mr-1" /> Editar
                    </Button>
                     <Button variant="destructive" size="sm" onClick={() => handleDelete(student.dni)} disabled={isPending}>
                      <Trash2 className="h-4 w-4 mr-1" /> Eliminar
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </ScrollArea>

      {!isPrintingAll && totalPages > 0 && !loading && !isPending && (
        <div className="flex items-center justify-end space-x-2 py-4 no-print">
          <span className="text-sm text-muted-foreground">
            Página {currentPage} de {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={goToPreviousPage}
            disabled={currentPage === 1 || isPending}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={goToNextPage}
            disabled={currentPage === totalPages || isPending}
          >
            Siguiente
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}

      {/* Edit Student Dialog */}
      {editingStudent && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto no-print">
            <DialogHeader>
              <DialogTitle>Editar Alumno: {editingStudent.nombres} {editingStudent.apellidos}</DialogTitle>
              <DialogDescription>DNI: {editingStudent.dni} (No editable)</DialogDescription>
            </DialogHeader>
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onSubmitEdit)} className="space-y-4 py-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="apellidos"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Apellidos</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="nombres"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombres</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="materia"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Materia</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="nota_parcial"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nota Parcial</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value ?? ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="recuperatorio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Recuperatorio</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value ?? ''}/>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="porcentaje_asistencia"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>% Asistencia</FormLabel>
                        <FormControl>
                           <Input type="number" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? null : Number(e.target.value))} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="porcentaje_tp_aprobados"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>% TP Aprobados</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? null : Number(e.target.value))} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="diario_clase"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Diario de Clase</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value ?? ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="condicion"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Condición</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="outline">Cancelar</Button>
                  </DialogClose>
                  <Button type="submit" disabled={isPending}>
                    {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Guardar Cambios
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      )}

      {/* Create Student Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto no-print">
          <DialogHeader>
            <DialogTitle>Crear Nuevo Alumno</DialogTitle>
            <DialogDescription>Complete los campos para agregar un nuevo alumno.</DialogDescription>
          </DialogHeader>
          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit(onSubmitCreate)} className="space-y-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={createForm.control}
                  name="dni"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>DNI</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Ingrese DNI del alumno" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="apellidos"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Apellidos</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Ingrese apellidos" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="nombres"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombres</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Ingrese nombres" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="materia"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Materia</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Ingrese materia" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="nota_parcial"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nota Parcial</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Ej: 7 o N/R" value={field.value ?? ''}/>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="recuperatorio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Recuperatorio</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Ej: 8 o -" value={field.value ?? ''}/>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="porcentaje_asistencia"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>% Asistencia</FormLabel>
                      <FormControl>
                         <Input type="number" {...field} placeholder="Ej: 85" value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? null : Number(e.target.value))} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="porcentaje_tp_aprobados"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>% TP Aprobados</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} placeholder="Ej: 100" value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? null : Number(e.target.value))} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="diario_clase"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Diario de Clase</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Ej: Al día" value={field.value ?? ''}/>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="condicion"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Condición</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Ej: REGULAR" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancelar</Button>
                </DialogClose>
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Crear Alumno
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="no-print">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente al alumno
              con DNI: <strong>{deletingStudentDni}</strong> de la base de datos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending} onClick={() => setIsDeleteDialogOpen(false)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={isPending} className="bg-destructive hover:bg-destructive/90">
              {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete All Confirmation Dialog */}
      <AlertDialog open={isDeleteAllDialogOpen} onOpenChange={setIsDeleteAllDialogOpen}>
        <AlertDialogContent className="no-print">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center">
                <ShieldAlert className="h-6 w-6 mr-2 text-destructive"/>
                ¿Estás ABSOLUTAMENTE seguro?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción es irreversible y eliminará permanentemente <strong>TODOS</strong> los datos de los alumnos
              de la base de datos. No podrás recuperar esta información.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending} onClick={() => setIsDeleteAllDialogOpen(false)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
                onClick={confirmDeleteAll} 
                disabled={isPending} 
                className="bg-destructive hover:bg-destructive/80 focus:ring-destructive"
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Sí, eliminar todo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}

    