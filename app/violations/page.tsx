import { createClient } from "@/lib/supabase/server";
import { getViolationTypes } from "@/features/violations/queries";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const dynamic = "force-dynamic";

type SearchParams = {
  from?: string;
  to?: string;
  typeId?: string;
};

export default async function ViolationsPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // 담임 학급 조회
  const { data: myClass } = await supabase
    .from("classes")
    .select("id, grade, class_number")
    .eq("homeroom_teacher_id", user.id)
    .single();

  const violationTypes = await getViolationTypes();

  let query = supabase
    .from("violations")
    .select(`
      id,
      violation_date,
      period,
      memo,
      students!inner (id, name, student_number, class_id),
      violation_types (id, label),
      profiles (name)
    `)
    .order("violation_date", { ascending: false })
    .order("period", { ascending: true });

  if (myClass) {
    query = query.eq("students.class_id", myClass.id);
  }
  if (searchParams.from) query = query.gte("violation_date", searchParams.from);
  if (searchParams.to) query = query.lte("violation_date", searchParams.to);
  if (searchParams.typeId) query = query.eq("violation_type_id", searchParams.typeId);

  const { data: violations } = await query;
  const list = violations ?? [];

  // 유형별 집계
  const typeCounts = list.reduce<Record<string, number>>((acc, v) => {
    const label = (v.violation_types as any)?.label ?? "기타";
    acc[label] = (acc[label] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          위반 이력
          {myClass && (
            <span className="ml-2 text-lg font-normal text-muted-foreground">
              {myClass.grade}학년 {myClass.class_number}반
            </span>
          )}
        </h1>
      </div>

      {/* 통계 */}
      <div className="flex gap-3 flex-wrap">
        <Card className="flex-1 min-w-[140px]">
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-sm text-muted-foreground">전체</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-3xl font-bold">{list.length}</p>
          </CardContent>
        </Card>
        {Object.entries(typeCounts).map(([label, count]) => (
          <Card key={label} className="flex-1 min-w-[140px]">
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-sm text-muted-foreground">{label}</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-3xl font-bold">{count}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 필터 */}
      <form className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <label className="text-sm font-medium">시작일</label>
          <input
            name="from"
            type="date"
            defaultValue={searchParams.from ?? ""}
            className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">종료일</label>
          <input
            name="to"
            type="date"
            defaultValue={searchParams.to ?? ""}
            className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">유형</label>
          <select
            name="typeId"
            defaultValue={searchParams.typeId ?? ""}
            className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
          >
            <option value="">전체</option>
            {violationTypes.map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
        >
          검색
        </button>
      </form>

      {/* 테이블 */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>날짜</TableHead>
              <TableHead>교시</TableHead>
              <TableHead>학생</TableHead>
              <TableHead>유형</TableHead>
              <TableHead>제출 교사</TableHead>
              <TableHead>메모</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  위반 기록이 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              list.map((v) => (
                <TableRow key={v.id}>
                  <TableCell>{v.violation_date}</TableCell>
                  <TableCell>{v.period}교시</TableCell>
                  <TableCell>
                    {(v.students as any)?.student_number}번 {(v.students as any)?.name}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{(v.violation_types as any)?.label}</Badge>
                  </TableCell>
                  <TableCell>{(v.profiles as any)?.name ?? "-"}</TableCell>
                  <TableCell className="text-muted-foreground">{v.memo ?? "-"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
