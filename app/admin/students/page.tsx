import { createClient } from "@/lib/supabase/server";
import { getStudents, getClasses } from "@/features/admin/queries";
import { createStudent } from "@/features/admin/actions";
import StudentCsvUpload from "@/features/admin/components/StudentCsvUpload";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function StudentsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const schoolId = user?.app_metadata?.school_id as string;

  const [students, classes] = await Promise.all([
    getStudents(schoolId),
    getClasses(schoolId),
  ]);

  const classOptions = classes.map((c) => ({
    id: c.id,
    grade: c.grade,
    class_number: c.class_number,
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">학생 관리</h1>

      {/* 개별 등록 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">학생 개별 등록</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createStudent} className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1">
              <label className="text-sm font-medium">학급</label>
              <select name="class_id" required className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm">
                <option value="">선택</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.grade}학년 {c.class_number}반</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">번호</label>
              <input name="student_number" type="number" min={1} max={50} required
                className="flex h-9 w-20 rounded-md border border-input bg-transparent px-3 py-1 text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">이름</label>
              <input name="name" type="text" required placeholder="홍길동"
                className="flex h-9 w-28 rounded-md border border-input bg-transparent px-3 py-1 text-sm" />
            </div>
            <Button type="submit">등록</Button>
          </form>
        </CardContent>
      </Card>

      {/* CSV 일괄 등록 */}
      <StudentCsvUpload classes={classOptions} schoolId={schoolId} />

      {/* 학생 목록 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">전체 학생 ({students.length}명)</CardTitle>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>학급</TableHead>
              <TableHead>번호</TableHead>
              <TableHead>이름</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                  등록된 학생이 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              students.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    {(s.classes as any)?.grade}학년 {(s.classes as any)?.class_number}반
                  </TableCell>
                  <TableCell>{s.student_number}번</TableCell>
                  <TableCell>{s.name}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
