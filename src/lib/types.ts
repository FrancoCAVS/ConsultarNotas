
export interface Evaluation {
  evaluationName: string;
  score: string | number;
}

// This type was for the Google Sheets mock data structure, no longer primarily used by GradesForm.
// Kept for now in case other parts of the app might use it, or for future reference.
export interface StudentGradeData {
  studentName: string;
  subject: string;
  evaluations: Evaluation[];
}

// Type for the data fetched from Supabase for the student details display on the home page
export interface StudentPartialGradeInfo {
  studentName: string; // Will be constructed from apellidos, nombres
  dni: string;
  apellidos: string; // Used to build studentName, not directly displayed if studentName is visible
  nombres: string;   // Used to build studentName, not directly displayed if studentName is visible
  subject: string; // maps to 'materia'
  partialGrade?: string | number | null; // maps to 'nota_parcial'
  recuperatorio?: string | number | null;
  porcentaje_asistencia?: number | null;
  porcentaje_tp_aprobados?: number | null;
  diario_clase?: string | null;
  condicion?: string | null; // Can be null if hidden
  // created_at and updated_at are not typically shown to the end-user here
}

// Type for the 'estudiantes_admin' table in Supabase
// Ensure this matches your Supabase table structure accurately.
export interface AdminStudentData {
  dni: string; // This is the primary key as per user's SQL for this table
  apellidos: string;
  nombres: string;
  materia: string;
  nota_parcial?: string | number | null;
  recuperatorio?: string | number | null;
  porcentaje_asistencia?: number | null;
  porcentaje_tp_aprobados?: number | null;
  diario_clase?: string | null;
  condicion: string;
  created_at?: string;
  updated_at?: string;
}

export interface VisibilitySetting {
  field_name: string; // Corresponds to a key in StudentPartialGradeInfo
  is_visible: boolean;
  label: string; // User-friendly label for the admin UI
  updated_at?: string; // Comes from Supabase
}
