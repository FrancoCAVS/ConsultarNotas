import type { StudentGradeData } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';

interface GradesDisplayProps {
  data: StudentGradeData;
}

export default function GradesDisplay({ data }: GradesDisplayProps) {
  return (
    <Card className="mt-6 shadow-md bg-background/80">
      <CardHeader>
        <CardTitle className="text-xl font-headline">{data.studentName}</CardTitle>
        <CardDescription className="text-md">Materia: {data.subject}</CardDescription>
      </CardHeader>
      <Separator className="my-2" />
      <CardContent className="pt-4">
        {data.evaluations.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-semibold">Evaluación</TableHead>
                <TableHead className="text-right font-semibold">Nota</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.evaluations.map((evaluation, index) => (
                <TableRow key={index}>
                  <TableCell>{evaluation.evaluationName}</TableCell>
                  <TableCell className="text-right">{evaluation.score}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-muted-foreground text-center py-4">No hay evaluaciones registradas para esta materia.</p>
        )}
      </CardContent>
    </Card>
  );
}
