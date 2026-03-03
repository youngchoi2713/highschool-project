import { createClient } from "@/lib/supabase/server";
import { getClasses, getTeachers } from "@/features/admin/queries";
import { createClass, assignHomeroom } from "@/features/admin/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

const currentYear = new Date().getFullYear();

export default async function ClassesPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const schoolId = user?.app_metadata?.school_id as string;

  const [classes, teachers] = await Promise.all([
    getClasses(schoolId),
    getTeachers(schoolId),
  ]);

  async function handleCreateClass(fd: FormData) {
    "use server";
    await createClass(fd);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">학급 관리</h1>

      {/* 학급 추가 폼 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">학급 추가</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={handleCreateClass} className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1">
              <label className="text-sm font-medium">학년</label>
              <select name="grade" required className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm">
                <option value="">선택</option>
                {[1, 2, 3].map((g) => <option key={g} value={g}>{g}학년</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">반</label>
              <input name="class_number" type="number" min={1} max={20} required
                className="flex h-9 w-20 rounded-md border border-input bg-transparent px-3 py-1 text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">학년도</label>
              <input name="year" type="number" defaultValue={currentYear} required
                className="flex h-9 w-24 rounded-md border border-input bg-transparent px-3 py-1 text-sm" />
            </div>
            <Button type="submit">추가</Button>
          </form>
        </CardContent>
      </Card>

      {/* 학급 목록 */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>학년</TableHead>
              <TableHead>반</TableHead>
              <TableHead>학년도</TableHead>
              <TableHead>담임 교사</TableHead>
              <TableHead>담임 배정</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {classes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  등록된 학급이 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              classes.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>{c.grade}학년</TableCell>
                  <TableCell>{c.class_number}반</TableCell>
                  <TableCell>{c.year}</TableCell>
                  <TableCell>{(c.profiles as any)?.name ?? "미배정"}</TableCell>
                  <TableCell>
                    <form
                      action={async (fd: FormData) => {
                        "use server";
                        const teacherId = fd.get("teacher_id") as string;
                        await assignHomeroom(c.id, teacherId);
                      }}
                      className="flex gap-2"
                    >
                      <select name="teacher_id" className="flex h-8 rounded-md border border-input bg-transparent px-2 text-sm">
                        <option value="">선택</option>
                        {teachers.map((t) => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                      <Button type="submit" size="sm" variant="outline">배정</Button>
                    </form>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
