
'use server';

import type { StudentPartialGradeInfo, AdminStudentData, VisibilitySetting } from '@/lib/types';
import { supabase } from '@/lib/supabaseClient';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import * as z from 'zod';

// --- Authentication Actions ---

const LoginSchema = z.object({
  username: z.string(),
  password: z.string(),
});

// Hardcoded credentials (for demonstration purposes only)
const ADMIN_USERNAME = 'jyampa';
const ADMIN_PASSWORD = 'YafeYafe$23';

export async function loginAdmin(credentials: unknown) {
  const validatedCredentials = LoginSchema.safeParse(credentials);

  if (!validatedCredentials.success) {
    return { error: 'Datos de entrada inválidos.' };
  }

  const { username, password } = validatedCredentials.data;

  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    // CORRECCIÓN: Se añade "await" antes de cookies()
    const cookieStore = await cookies(); 
    cookieStore.set('admin-auth', 'true', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 1 week
    });
    return { success: true };
  } else {
    return { error: 'Nombre de usuario o contraseña incorrectos.' };
  }
}

export async function logoutAdmin() {
  // CORRECIÓN: Se añade "await" antes de cookies()
  const cookieStore = await cookies();
  cookieStore.delete('admin-auth');
  redirect('/login');
}

// --- Visibility Settings Actions ---

export async function getVisibilitySettings(): Promise<{ data?: VisibilitySetting[]; error?: string }> {
  console.log('[getVisibilitySettings] Fetching visibility settings from Supabase.');
  try {
    const { data, error } = await supabase
      .from('admin_visibility_settings')
      .select('*');

    if (error) {
      console.error('[getVisibilitySettings] Error fetching visibility settings:', error);
      if (error.message.toLowerCase().includes("does not exist")) {
         return { error: `Error crítico: La tabla 'admin_visibility_settings' no existe o no es accesible. Por favor, créela y popúlela como se indica en la documentación. (${error.message})` };
      }
      return { error: `Error al cargar la configuración de visibilidad: ${error.message || 'Error desconocido de Supabase.'}` };
    }
    console.log('[getVisibilitySettings] Settings fetched:', data);
    return { data: data || [] };
  } catch (err: any) {
    console.error('[getVisibilitySettings] Unexpected error:', err);
    return { error: `Error inesperado al cargar la configuración: ${err.message || 'Ocurrió un problema.'}` };
  }
}

export async function updateVisibilitySetting(
  fieldName: string,
  isVisible: boolean
): Promise<{ data?: VisibilitySetting; error?: string }> {
  console.log(`[updateVisibilitySetting] Updating ${fieldName} to ${isVisible}`);
  try {
    const { data, error } = await supabase
      .from('admin_visibility_settings')
      .update({ is_visible: isVisible, updated_at: new Date().toISOString() })
      .eq('field_name', fieldName)
      .select()
      .single();

    if (error) {
      console.error('[updateVisibilitySetting] Error updating setting:', error);
      let friendlyMessage = `Error al actualizar la configuración para '${fieldName}': ${error.message || 'Error desconocido de Supabase.'}`;
      if (error.code === 'PGRST116' || error.message.toLowerCase().includes("does not exist")) {
         friendlyMessage = `Error al actualizar '${fieldName}': El campo no existe en la configuración de visibilidad o la tabla no es accesible. Asegúrese de que la tabla 'admin_visibility_settings' esté correctamente poblada.`;
      }
      return { error: friendlyMessage };
    }
    console.log('[updateVisibilitySetting] Setting updated:', data);
    return { data };
  } catch (err: any) {
    console.error('[updateVisibilitySetting] Unexpected error:', err);
    return { error: `Error inesperado al actualizar '${fieldName}': ${err.message || 'Ocurrió un problema.'}` };
  }
}

// --- Student Data Actions ---

export async function fetchStudentPartialGrade(dni: string): Promise<{ data?: Partial<StudentPartialGradeInfo>; error?: string }> {
  console.log(`[fetchStudentPartialGrade] Iniciando búsqueda en Supabase para DNI: ${dni}`);
  if (!dni) {
    console.error('[fetchStudentPartialGrade] Error: El DNI no puede estar vacío.');
    return { error: 'El DNI no puede estar vacío.' };
  }

  try {
    const { data: studentData, error: studentError } = await supabase
      .from('estudiantes_admin')
      .select('*')
      .eq('dni', dni)
      .single();

    if (studentError) {
      if (studentError.code === 'PGRST116') {
        console.warn(`[fetchStudentPartialGrade] No se encontró el DNI: ${dni} en la tabla estudiantes_admin.`);
        return { error: `No se encontraron datos para el DNI: ${dni}. Verifique el DNI.` };
      }
      console.error('[fetchStudentPartialGrade] Error de Supabase al buscar alumno:', studentError);
      return { error: `Error al consultar la base de datos: ${studentError.message || 'Error desconocido de Supabase.'}` };
    }

    if (!studentData) {
      console.warn(`[fetchStudentPartialGrade] No se encontraron datos para el DNI: ${dni} (inesperado).`);
      return { error: `No se encontraron datos para el DNI: ${dni}.` };
    }

    const { data: visibilitySettings, error: settingsError } = await getVisibilitySettings();
    
    const visibleFieldsConfig: Record<string, boolean> = {};
    if (settingsError || !visibilitySettings || visibilitySettings.length === 0) {
      console.error('[fetchStudentPartialGrade] Error fetching visibility settings or settings are empty, defaulting to all visible for this query as a fallback:', settingsError);
      ['studentName', 'dni', 'apellidos', 'nombres', 'subject', 'partialGrade', 'recuperatorio', 'porcentaje_asistencia', 'porcentaje_tp_aprobados', 'diario_clase', 'condicion'].forEach(key => visibleFieldsConfig[key] = true);
    } else {
      visibilitySettings.forEach(setting => {
        visibleFieldsConfig[setting.field_name] = setting.is_visible;
      });
    }
    
    const rawInfo: StudentPartialGradeInfo = {
        studentName: `${studentData.apellidos || ''} ${studentData.nombres || ''}`.trim(),
        dni: studentData.dni,
        apellidos: studentData.apellidos,
        nombres: studentData.nombres,
        subject: studentData.materia,
        partialGrade: studentData.nota_parcial,
        recuperatorio: studentData.recuperatorio,
        porcentaje_asistencia: studentData.porcentaje_asistencia,
        porcentaje_tp_aprobados: studentData.porcentaje_tp_aprobados,
        diario_clase: studentData.diario_clase,
        condicion: studentData.condicion,
      };

    const filteredInfo: Partial<StudentPartialGradeInfo> = {};

    if (visibleFieldsConfig['studentName'] !== false) { 
        filteredInfo.studentName = rawInfo.studentName;
    }
    
    (Object.keys(rawInfo) as Array<keyof StudentPartialGradeInfo>).forEach(key => {
        if (key === 'studentName' || key === 'apellidos' || key === 'nombres') return; 

        if (visibleFieldsConfig[key] !== false) { 
            filteredInfo[key] = rawInfo[key];
        }
    });
    
    console.log('[fetchStudentPartialGrade] Datos originales:', rawInfo);
    console.log('[fetchStudentPartialGrade] Configuración de visibilidad aplicada:', visibleFieldsConfig);
    console.log('[fetchStudentPartialGrade] Datos filtrados a devolver:', filteredInfo);
    
    const hasVisibleData = Object.keys(filteredInfo).length > 0;
    if (!hasVisibleData && Object.keys(rawInfo).length > 0 && !studentError && (!settingsError || (visibilitySettings && visibilitySettings.length > 0))) {
         return { error: `No hay campos visibles configurados para mostrar para el DNI: ${dni}. Contacte al administrador.` };
    }

    return { data: filteredInfo };

  } catch (error: any) {
    console.error('[fetchStudentPartialGrade] Error capturado en el bloque catch:', error);
    return { error: 'Ocurrió un error inesperado al buscar la calificación. Intente más tarde.' };
  }
}

export async function updateStudentAdminData(
  dni: string,
  updatedData: Omit<AdminStudentData, 'dni' | 'created_at' | 'updated_at'>
): Promise<{ data?: AdminStudentData; error?: string }> {
  console.log(`[updateStudentAdminData] Actualizando datos para DNI: ${dni}`, updatedData);
  if (!dni) {
    return { error: 'El DNI es requerido para actualizar los datos.' };
  }

  try {
    const dataToUpdate = {
      ...updatedData,
      porcentaje_asistencia: updatedData.porcentaje_asistencia === '' || updatedData.porcentaje_asistencia === null || updatedData.porcentaje_asistencia === undefined ? null : Number(updatedData.porcentaje_asistencia),
      porcentaje_tp_aprobados: updatedData.porcentaje_tp_aprobados === '' || updatedData.porcentaje_tp_aprobados === null || updatedData.porcentaje_tp_aprobados === undefined ? null : Number(updatedData.porcentaje_tp_aprobados),
      nota_parcial: updatedData.nota_parcial === '' ? null : updatedData.nota_parcial,
      recuperatorio: updatedData.recuperatorio === '' ? null : updatedData.recuperatorio,
      diario_clase: updatedData.diario_clase === '' ? null : updatedData.diario_clase,
      updated_at: new Date().toISOString(),
    };
    
    const { data, error } = await supabase
      .from('estudiantes_admin')
      .update(dataToUpdate)
      .eq('dni', dni)
      .select()
      .single();

    if (error) {
      console.error('[updateStudentAdminData] Error de Supabase al actualizar:', error);
      return { error: `Error al actualizar datos: ${error.message || 'Error desconocido de Supabase.'}` };
    }

    if (data) {
      console.log('[updateStudentAdminData] Datos actualizados exitosamente:', data);
      return { data };
    } else {
      return { error: 'No se pudo actualizar el registro o no se encontró el DNI.' };
    }
  } catch (err: any) {
    console.error('[updateStudentAdminData] Error inesperado:', err);
    return { error: `Error inesperado al actualizar: ${err.message || 'Ocurrió un problema desconocido.'}` };
  }
}

export async function importStudentsFromCSV(
  students: AdminStudentData[]
): Promise<{ successCount: number; error?: string; skippedDuplicates: string[] }> {
  if (!students || students.length === 0) {
    return { successCount: 0, error: 'No se proporcionaron datos de estudiantes.', skippedDuplicates: [] };
  }

  const incomingDnis = students.map(s => s.dni).filter(dni => dni); 

  if (incomingDnis.length === 0) {
    return { successCount: 0, error: 'El archivo CSV no contenía DNIs válidos.', skippedDuplicates: [] };
  }
  
  console.log('[importStudentsFromCSV] DNIs entrantes:', incomingDnis);

  const { data: existingStudents, error: fetchError } = await supabase
    .from('estudiantes_admin')
    .select('dni')
    .in('dni', incomingDnis);

  if (fetchError) {
    console.error('[importStudentsFromCSV] Error fetching existing DNIs:', fetchError);
    return { successCount: 0, error: `Error al verificar duplicados: ${fetchError.message || 'Error desconocido de Supabase.'}`, skippedDuplicates: [] };
  }

  const existingDnis = new Set(existingStudents.map(s => s.dni));
  console.log('[importStudentsFromCSV] DNIs existentes en DB:', Array.from(existingDnis));

  const studentsToInsert: Omit<AdminStudentData, 'created_at' | 'updated_at'>[] = [];
  const skippedDuplicates: string[] = [];

  for (const student of students) {
    if (!student.dni) continue; 

    if (existingDnis.has(student.dni)) {
      skippedDuplicates.push(student.dni);
    } else {
      studentsToInsert.push({
        dni: student.dni,
        apellidos: student.apellidos,
        nombres: student.nombres,
        materia: student.materia,
        nota_parcial: student.nota_parcial || null,
        recuperatorio: student.recuperatorio || null,
        porcentaje_asistencia: student.porcentaje_asistencia ? parseInt(String(student.porcentaje_asistencia), 10) : null,
        porcentaje_tp_aprobados: student.porcentaje_tp_aprobados ? parseInt(String(student.porcentaje_tp_aprobados), 10) : null,
        diario_clase: student.diario_clase || null,
        condicion: student.condicion,
      });
    }
  }
  
  console.log('[importStudentsFromCSV] Estudiantes para insertar:', studentsToInsert.length);
  console.log('[importStudentsFromCSV] DNIs duplicados omitidos:', skippedDuplicates);

  if (studentsToInsert.length === 0) {
    if (skippedDuplicates.length > 0) {
      return { successCount: 0, skippedDuplicates, error: 'Todos los DNIs del CSV ya existen o no había nuevos estudiantes para importar.' };
    }
    return { successCount: 0, skippedDuplicates, error: 'No hay nuevos estudiantes para importar del CSV.' };
  }

  const { error: insertError } = await supabase.from('estudiantes_admin').insert(studentsToInsert);

  if (insertError) {
    console.error('[importStudentsFromCSV] Error inserting students:', insertError);
    if (insertError.message.includes('duplicate key value violates unique constraint')) { 
      return { successCount: 0, error: `Error de DNI duplicado durante la inserción masiva: ${insertError.message || 'Error desconocido de Supabase.'}. Verifique que los DNIs sean únicos.`, skippedDuplicates };
    }
    return { successCount: 0, error: `Error al insertar estudiantes: ${insertError.message || 'Error desconocido de Supabase.'}`, skippedDuplicates };
  }

  return { successCount: studentsToInsert.length, skippedDuplicates };
}

export async function createStudentAdminData(
  studentData: Omit<AdminStudentData, 'created_at' | 'updated_at'>
): Promise<{ data?: AdminStudentData; error?: string }> {
  console.log('[createStudentAdminData] Creando nuevo alumno:', studentData);
  if (!studentData.dni) {
    return { error: 'El DNI es un campo requerido para crear un alumno.' };
  }

  try {
    const dataToInsert = {
      ...studentData,
      porcentaje_asistencia: studentData.porcentaje_asistencia === '' || studentData.porcentaje_asistencia === null || studentData.porcentaje_asistencia === undefined ? null : Number(studentData.porcentaje_asistencia),
      porcentaje_tp_aprobados: studentData.porcentaje_tp_aprobados === '' || studentData.porcentaje_tp_aprobados === null || studentData.porcentaje_tp_aprobados === undefined ? null : Number(studentData.porcentaje_tp_aprobados),
      nota_parcial: studentData.nota_parcial === '' ? null : studentData.nota_parcial,
      recuperatorio: studentData.recuperatorio === '' ? null : studentData.recuperatorio,
      diario_clase: studentData.diario_clase === '' ? null : studentData.diario_clase,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('estudiantes_admin')
      .insert(dataToInsert)
      .select()
      .single();

    if (error) {
      console.error('[createStudentAdminData] Error de Supabase al crear:', error);
      if (error.code === '23505') { 
        return { error: `Ya existe un alumno con el DNI: ${studentData.dni}.` };
      }
      return { error: `Error al crear alumno: ${error.message || 'Error desconocido de Supabase.'}` };
    }

    if (data) {
      console.log('[createStudentAdminData] Alumno creado exitosamente:', data);
      return { data };
    } else {
      return { error: 'No se pudo crear el alumno (respuesta inesperada de la base de datos).' };
    }
  } catch (err: any) {
    console.error('[createStudentAdminData] Error inesperado:', err);
    return { error: `Error inesperado al crear alumno: ${err.message || 'Ocurrió un problema desconocido.'}` };
  }
}

export async function deleteStudentAdminData(dni: string): Promise<{ error?: string }> {
  console.log(`[deleteStudentAdminData] Eliminando alumno con DNI: ${dni}`);
  if (!dni) {
    return { error: 'El DNI es requerido para eliminar un alumno.' };
  }

  try {
    const { error } = await supabase
      .from('estudiantes_admin')
      .delete()
      .eq('dni', dni);

    if (error) {
      console.error('[deleteStudentAdminData] Error de Supabase al eliminar:', error);
      return { error: `Error al eliminar alumno: ${error.message || 'Error desconocido de Supabase.'}` };
    }
    console.log(`[deleteStudentAdminData] Alumno con DNI ${dni} eliminado exitosamente (o no encontrado).`);
    return {}; 
  } catch (err: any) {
    console.error('[deleteStudentAdminData] Error inesperado:', err);
    return { error: `Error inesperado al eliminar alumno: ${err.message || 'Ocurrió un problema desconocido.'}` };
  }
}

export async function deleteAllStudentsAdminData(): Promise<{ error?: string }> {
  console.log(`[deleteAllStudentsAdminData] Eliminando todos los alumnos.`);
  try {
    const { error } = await supabase
      .from('estudiantes_admin')
      .delete()
      .neq('dni', 'non_existent_value_to_match_all_placeholder'); 

    if (error) {
      console.error('[deleteAllStudentsAdminData] Error de Supabase al eliminar todos los alumnos:', error);
      return { error: `Error al eliminar todos los alumnos: ${error.message || 'Error desconocido de Supabase.'}` };
    }

    console.log(`[deleteAllStudentsAdminData] Todos los alumnos eliminados exitosamente.`);
    return {};
  } catch (err: any) {
    console.error('[deleteAllStudentsAdminData] Error inesperado:', err);
    return { error: `Error inesperado al eliminar todos los alumnos: ${err.message || 'Ocurrió un problema desconocido.'}` };
  }
}
