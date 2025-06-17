export default function AppFooter() {
  return (
    <footer data-main-footer className="border-t border-border/40 py-6 md:py-8">
      <div className="container flex flex-col items-center justify-center gap-4 md:h-16 md:flex-row">
        <p className="text-center text-sm leading-loose text-muted-foreground">
          &copy; {new Date().getFullYear()} MiNotaEdu. Todos los derechos reservados.
        </p>
      </div>
    </footer>
  );
}
