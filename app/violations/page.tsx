import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getViolationTypes } from "@/features/violations/queries";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const dynamic = "force-dynamic";

type SearchParams = {
  from?: string;
  to?: string;
  typeId?: string;
  q?: string;
};

export default async function ViolationsPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: myClass } = await supabase
    .from("classes")
    .select("id, grade, class_number")
    .eq("homeroom_teacher_id", user.id)
    .single();

  if (!myClass) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 p-8">
        <h1 className="text-2xl font-bold">위반 이력</h1>
        <p className="text-muted-foreground">
          배정된 담임 학급이 없습니다. 관리자에게 문의하세요.
        </p>
        <Link
          href="/"
          className="inline-block rounded-md border px-3 py-2 text-sm hover:bg-accent"
        >
          메인으로 가기
        </Link>
      </div>
    );
  }

  const violationTypes = await getViolationTypes();

  let query = supabase
    .from("violations")
    .select(`
      id,
      violation_date,
      period,
      memo,
      students!inner (id, name, student_number, class_id),
      violation_types (id, label, code),
      profiles (name)
    `)
    .eq("students.class_id", myClass.id)
    .order("violation_date", { ascending: false })
    .order("period", { ascending: true });
  if (searchParams.from) query = query.gte("violation_date", searchParams.from);
  if (searchParams.to) query = query.lte("violation_date", searchParams.to);
  if (searchParams.typeId) query = query.eq("violation_type_id", searchParams.typeId);

  const { data: violations } = await query;
  const rawList = violations ?? [];
  const keyword = (searchParams.q ?? "").trim();
  const list = keyword
    ? rawList.filter((v) => {
      const student = v.students as any;
      const name = String(student?.name ?? "");
      const num = String(student?.student_number ?? "");
      return name.includes(keyword) || num.includes(keyword);
    })
    : rawList;

  const typeCounts = list.reduce<Record<string, number>>((acc, v) => {
    const label = (v.violation_types as any)?.label ?? "기타";
    acc[label] = (acc[label] ?? 0) + 1;
    return acc;
  }, {});

  const studentSummaryMap = new Map<string, {
    student: string;
    total: number;
    electronic: number;
    uniform: number;
    lastDate: string;
  }>();

  for (const v of list) {
    const student = v.students as any;
    const type = v.violation_types as any;
    const key = `${student?.id ?? ""}`;
    if (!key) continue;

    const current = studentSummaryMap.get(key) ?? {
      student: `${student?.student_number ?? "-"}번 ${student?.name ?? "-"}`,
      total: 0,
      electronic: 0,
      uniform: 0,
      lastDate: v.violation_date,
    };
    current.total += 1;
    if (type?.code === "electronic_device") current.electronic += 1;
    if (type?.code === "uniform") current.uniform += 1;
    if (v.violation_date > current.lastDate) current.lastDate = v.violation_date;
    studentSummaryMap.set(key, current);
  }

  const studentSummary = Array.from(studentSummaryMap.values()).sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total;
    return a.student.localeCompare(b.student, "ko");
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          위반 이력
          <span className="ml-2 text-lg font-normal text-muted-foreground">
            {myClass.grade}학년 {myClass.class_number}반
          </span>
        </h1>
        <Link href="/" className="rounded-md border px-3 py-2 text-sm hover:bg-accent">
          메인으로
        </Link>
      </div>

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

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">학생별 위반 요약</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>학생</TableHead>
                <TableHead>총 위반</TableHead>
                <TableHead>전자기기</TableHead>
                <TableHead>교복</TableHead>
                <TableHead>최근 위반일</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {studentSummary.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    집계할 데이터가 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                studentSummary.map((s) => (
                  <TableRow key={s.student}>
                    <TableCell>{s.student}</TableCell>
                    <TableCell className="font-semibold">{s.total}</TableCell>
                    <TableCell>{s.electronic}</TableCell>
                    <TableCell>{s.uniform}</TableCell>
                    <TableCell>{s.lastDate}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

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
        <div className="space-y-1">
          <label className="text-sm font-medium">학생 검색</label>
          <input
            name="q"
            defaultValue={searchParams.q ?? ""}
            placeholder="번호 또는 이름"
            className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
          />
        </div>
        <button
          type="submit"
          className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
        >
          검색
        </button>
      </form>

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
