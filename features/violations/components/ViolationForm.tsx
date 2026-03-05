"use client";

import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getStudentsByClassAction, submitViolation } from "../actions";

type Class = { id: string; grade: number; class_number: number; year?: number };
type Student = { id: string; student_number: number; name: string };
type ViolationType = { id: string; code: string; label: string };

type Props = {
  classes: Class[];
  violationTypes: ViolationType[];
};

const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const today = () => new Date().toISOString().slice(0, 10);

export default function ViolationForm({ classes, violationTypes }: Props) {
  const [isPending, startTransition] = useTransition();
  const [students, setStudents] = useState<Student[]>([]);
  const [grade, setGrade] = useState("");
  const [classId, setClassId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [studentQuery, setStudentQuery] = useState("");
  const [selectedTypeIds, setSelectedTypeIds] = useState<string[]>([]);
  const [period, setPeriod] = useState("");
  const [date, setDate] = useState(today());
  const [memo, setMemo] = useState("");
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const gradeOptions = useMemo(
    () => Array.from(new Set(classes.map((c) => String(c.grade)))).sort((a, b) => Number(a) - Number(b)),
    [classes]
  );

  const filteredClasses = useMemo(
    () => classes.filter((c) => String(c.grade) === grade),
    [classes, grade]
  );

  const filteredStudents = useMemo(() => {
    const q = studentQuery.trim();
    const base = [...students].sort((a, b) => a.student_number - b.student_number);
    if (!q) return base;

    return base
      .filter((s) => `${s.student_number}`.includes(q) || s.name.includes(q))
      .sort((a, b) => {
        const aStarts = `${a.student_number}`.startsWith(q) || a.name.startsWith(q);
        const bStarts = `${b.student_number}`.startsWith(q) || b.name.startsWith(q);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return a.student_number - b.student_number;
      });
  }, [students, studentQuery]);

  const selectedStudent = students.find((s) => s.id === studentId);

  const inspectionTypes = useMemo(() => {
    const focused = violationTypes.filter(
      (t) => t.code === "electronic_device" || t.code === "uniform"
    );
    return focused.length > 0 ? focused : violationTypes;
  }, [violationTypes]);

  function handleGradeChange(value: string) {
    setGrade(value);
    setClassId("");
    setStudents([]);
    setStudentId("");
    setStudentQuery("");
  }

  async function handleClassChange(id: string) {
    setClassId(id);
    setStudentId("");
    setStudentQuery("");
    const list = await getStudentsByClassAction(id);
    setStudents(list);
  }

  function toggleType(id: string) {
    setSelectedTypeIds((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setResult(null);

    if (!date || !period || !grade || !classId || !studentId || selectedTypeIds.length === 0) {
      setResult({ ok: false, msg: "메모를 제외한 모든 항목을 입력해주세요." });
      return;
    }

    startTransition(async () => {
      const res = await submitViolation({
        studentId,
        violationTypeIds: selectedTypeIds,
        violationDate: date,
        period: Number(period),
        memo,
      });

      if (res.error) {
        setResult({ ok: false, msg: res.error });
      } else {
        setResult({
          ok: true,
          msg: `${res.count ?? selectedTypeIds.length}건의 위반 사항이 등록되었습니다.`,
        });
        setStudentId("");
        setStudentQuery("");
        setSelectedTypeIds([]);
        setPeriod("");
        setMemo("");
      }
    });
  }

  return (
    <Card className="w-full max-w-xl">
      <CardHeader>
        <CardTitle>위반 사항 제출</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="date">날짜 *</Label>
            <input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            />
          </div>

          <div className="space-y-1">
            <Label>교시 *</Label>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger>
                <SelectValue placeholder="교시 선택" />
              </SelectTrigger>
              <SelectContent>
                {PERIODS.map((p) => (
                  <SelectItem key={p} value={String(p)}>{p}교시</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>학년 *</Label>
            <Select value={grade} onValueChange={handleGradeChange}>
              <SelectTrigger>
                <SelectValue placeholder="학년 선택" />
              </SelectTrigger>
              <SelectContent>
                {gradeOptions.map((g) => (
                  <SelectItem key={g} value={g}>{g}학년</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>학급 *</Label>
            <Select value={classId} onValueChange={handleClassChange} disabled={!grade}>
              <SelectTrigger>
                <SelectValue placeholder={grade ? "학급 선택" : "학년을 먼저 선택하세요"} />
              </SelectTrigger>
              <SelectContent>
                {filteredClasses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.class_number}반
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="studentSearch">학생 검색 *</Label>
            <Input
              id="studentSearch"
              value={studentQuery}
              onChange={(e) => setStudentQuery(e.target.value)}
              placeholder="번호 또는 이름 입력"
              disabled={!classId}
            />
          </div>

          <div className="space-y-1">
            <Label>학생 선택 *</Label>
            <Select value={studentId} onValueChange={setStudentId} disabled={!classId}>
              <SelectTrigger>
                <SelectValue placeholder={classId ? "학생 선택" : "학급을 먼저 선택하세요"} />
              </SelectTrigger>
              <SelectContent>
                {filteredStudents.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.student_number}번 {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {classId && filteredStudents.length === 0 && (
              <p className="text-xs text-muted-foreground">검색 조건에 맞는 학생이 없습니다.</p>
            )}
          </div>

          {selectedStudent && (
            <div className="rounded-md border bg-muted/30 p-3 text-sm">
              <p className="font-medium">선택 학생</p>
              <p className="text-muted-foreground">
                {selectedStudent.student_number}번 {selectedStudent.name}
              </p>
            </div>
          )}

          <div className="space-y-1">
            <Label>점검 항목 * (전자기기 또는 교복)</Label>
            <div className="space-y-2 rounded-md border p-3">
              {inspectionTypes.map((t) => (
                <label key={t.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedTypeIds.includes(t.id)}
                    onChange={() => toggleType(t.id)}
                  />
                  {t.label}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="memo">메모 (선택)</Label>
            <textarea
              id="memo"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              rows={2}
              placeholder="추가 내용 입력..."
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm resize-none"
            />
          </div>

          {result && (
            <p className={`text-sm ${result.ok ? "text-green-600" : "text-destructive"}`}>
              {result.msg}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "제출 중..." : "제출"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
