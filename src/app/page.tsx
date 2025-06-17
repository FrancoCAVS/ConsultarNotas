import GradesForm from '@/components/grades-form';

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center space-y-8 py-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-primary">
          Bienvenido a MiNotaEdu
        </h1>
        <p className="text-lg text-muted-foreground mt-3">
          Ingresa tu DNI a continuación para ver el detalle de tus notas.
        </p>
      </div>
      <GradesForm />
    </div>
  );
}
