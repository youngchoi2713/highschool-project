import { createClient } from "@/lib/supabase/server";
import { getTeachers, getPendingTeachers } from "@/features/admin/queries";
import { approveTeacher, updateTeacherRole } from "@/features/admin/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

const ROLE_LABELS: Record<string, string> = {
  subject: "교과",
  homeroom: "담임",
  school_admin: "학교관리자",
};

const ROLE_COLORS: Record<string, "default" | "secondary" | "outline"> = {
  subject: "secondary",
  homeroom: "default",
  school_admin: "outline",
};

export default async function TeachersPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const schoolId = user?.app_metadata?.school_id as string;

  const [teachers, pending] = await Promise.all([
    getTeachers(schoolId),
    getPendingTeachers(),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">교사 관리</h1>

      {/* 승인 대기 */}
      {pending.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-base text-orange-700">
              승인 대기 중 ({pending.length}명)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>이름</TableHead>
                  <TableHead>이메일</TableHead>
                  <TableHead>역할 지정 후 승인</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pending.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>{t.name ?? "이름 미입력"}</TableCell>
                    <TableCell>{t.email}</TableCell>
                    <TableCell>
                      <form
                        action={async (fd: FormData) => {
                          "use server";
                          const role = fd.get("role") as "homeroom" | "subject";
                          await approveTeacher(t.id, role, schoolId);
                        }}
                        className="flex gap-2"
                      >
                        <select name="role" required className="flex h-8 rounded-md border border-input bg-transparent px-2 text-sm">
                          <option value="">역할 선택</option>
                          <option value="subject">교과 교사</option>
                          <option value="homeroom">담임 교사</option>
                        </select>
                        <Button type="submit" size="sm">승인</Button>
                      </form>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* 등록된 교사 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">등록된 교사 ({teachers.length}명)</CardTitle>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>이름</TableHead>
              <TableHead>이메일</TableHead>
              <TableHead>현재 역할</TableHead>
              <TableHead>역할 변경</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {teachers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  등록된 교사가 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              teachers.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>{t.name}</TableCell>
                  <TableCell>{t.email}</TableCell>
                  <TableCell>
                    <Badge variant={ROLE_COLORS[t.role ?? ""] ?? "secondary"}>
                      {ROLE_LABELS[t.role ?? ""] ?? t.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <form
                      action={async (fd: FormData) => {
                        "use server";
                        const role = fd.get("role") as "homeroom" | "subject" | "school_admin";
                        await updateTeacherRole(t.id, role);
                      }}
                      className="flex gap-2"
                    >
                      <select name="role" defaultValue={t.role ?? ""} className="flex h-8 rounded-md border border-input bg-transparent px-2 text-sm">
                        <option value="subject">교과</option>
                        <option value="homeroom">담임</option>
                        <option value="school_admin">학교관리자</option>
                      </select>
                      <Button type="submit" size="sm" variant="outline">변경</Button>
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
