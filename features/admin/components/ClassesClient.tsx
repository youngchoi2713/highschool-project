"use client";

import { useState, useTransition, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  createClass,
  updateClass,
  deleteClass,
  assignHomeroom,
} from "../actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";

const currentYear = new Date().getFullYear();

type ClassRow = {
  id: string;
  grade: number;
  class_number: number;
  year: number;
  profiles: { id: string; name: string } | null;
};

type TeacherOption = { id: string; name: string };

type Msg = { type: "success" | "error"; text: string };

type Props = {
  classes: ClassRow[];
  teachers: TeacherOption[];
};

export default function ClassesClient({ classes, teachers }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [localClasses, setLocalClasses] = useState<ClassRow[]>(classes);
  const [addMsg, setAddMsg] = useState<Msg | null>(null);
  const [activeGrade, setActiveGrade] = useState<1 | 2 | 3>(1);
  const [editId, setEditId] = useState<string | null>(null);
  const [editData, setEditData] = useState({
    grade: 1,
    class_number: 1,
    year: currentYear,
    teacherId: "",
  });
  const [rowMsg, setRowMsg] = useState<Record<string, Msg>>({});

  // server refresh 시 로컬 상태 동기화
  useEffect(() => { setLocalClasses(classes); }, [classes]);

  // 현재 탭의 학급 목록 (반 오름차순 정렬)
  const displayedClasses = useMemo(
    () =>
      localClasses
        .filter((c) => c.grade === activeGrade)
        .sort((a, b) => a.class_number - b.class_number),
    [localClasses, activeGrade]
  );

  // 학년별 학급 수
  const gradeCounts = useMemo(() => {
    const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0 };
    localClasses.forEach((c) => { if (c.grade in counts) counts[c.grade]++; });
    return counts;
  }, [localClasses]);

  function setRow(id: string, msg: Msg) {
    setRowMsg((prev) => ({ ...prev, [id]: msg }));
  }

  function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAddMsg(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await createClass(fd);
      if (res.error) {
        setAddMsg({ type: "error", text: res.error });
      } else {
        setAddMsg({ type: "success", text: "학급이 추가되었습니다." });
        if (res.data) {
          setLocalClasses((prev) => [...prev, { ...res.data!, profiles: null }]);
          setActiveGrade(res.data.grade as 1 | 2 | 3);
        }
        (e.target as HTMLFormElement).reset();
        router.refresh();
      }
    });
  }

  function startEdit(c: ClassRow) {
    setEditId(c.id);
    setEditData({
      grade: c.grade,
      class_number: c.class_number,
      year: c.year,
      teacherId: c.profiles?.id ?? "",
    });
    setRowMsg((prev) => { const n = { ...prev }; delete n[c.id]; return n; });
  }

  function handleEditSave(classId: string) {
    const originalClass = localClasses.find((c) => c.id === classId);
    startTransition(async () => {
      const res = await updateClass(classId, {
        grade: editData.grade,
        class_number: editData.class_number,
        year: editData.year,
      });
      if (res.error) {
        setRow(classId, { type: "error", text: res.error });
        return;
      }

      // 담임 배정이 변경된 경우
      if (editData.teacherId !== (originalClass?.profiles?.id ?? "")) {
        const assignRes = await assignHomeroom(classId, editData.teacherId);
        if (assignRes.error) {
          setRow(classId, { type: "error", text: assignRes.error });
          return;
        }
      }

      const teacher = teachers.find((t) => t.id === editData.teacherId);
      setLocalClasses((prev) =>
        prev.map((c) =>
          c.id === classId
            ? {
                ...c,
                grade: editData.grade,
                class_number: editData.class_number,
                year: editData.year,
                profiles: editData.teacherId
                  ? { id: editData.teacherId, name: teacher?.name ?? "" }
                  : null,
              }
            : c
        )
      );
      setEditId(null);
      router.refresh();
    });
  }

  function handleDelete(classId: string) {
    if (!confirm("이 학급을 삭제하시겠습니까?")) return;
    startTransition(async () => {
      const res = await deleteClass(classId);
      if (res.error) {
        setRow(classId, { type: "error", text: res.error });
      } else {
        setLocalClasses((prev) => prev.filter((c) => c.id !== classId));
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* 학급 추가 폼 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">학급 추가</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAdd} className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1">
              <label className="text-sm font-medium">학년</label>
              <select
                name="grade"
                required
                className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
              >
                <option value="">선택</option>
                {[1, 2, 3].map((g) => (
                  <option key={g} value={g}>{g}학년</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">반</label>
              <input
                name="class_number"
                type="number"
                min={1}
                max={20}
                required
                className="flex h-9 w-20 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">학년도</label>
              <input
                name="year"
                type="number"
                defaultValue={currentYear}
                required
                className="flex h-9 w-24 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
              />
            </div>
            <Button type="submit" disabled={isPending}>추가</Button>
          </form>
          {addMsg && (
            <p className={`mt-2 text-sm ${addMsg.type === "success" ? "text-green-600" : "text-destructive"}`}>
              {addMsg.text}
            </p>
          )}
        </CardContent>
      </Card>

      {/* 학급 목록 */}
      <Card>
        {/* 학년 탭 */}
        <div className="flex border-b px-4">
          {([1, 2, 3] as const).map((g) => (
            <button
              key={g}
              onClick={() => setActiveGrade(g)}
              className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeGrade === g
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {g}학년
              <span className="ml-1.5 text-xs bg-muted text-muted-foreground rounded-full px-1.5 py-0.5">
                {gradeCounts[g]}
              </span>
            </button>
          ))}
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>반</TableHead>
              <TableHead>학년도</TableHead>
              <TableHead>담임 교사</TableHead>
              <TableHead>관리</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayedClasses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  {activeGrade}학년 학급이 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              displayedClasses.map((c) => (
                <TableRow key={c.id}>
                  {editId === c.id ? (
                    <>
                      <TableCell>
                        <input
                          type="number"
                          min={1}
                          max={20}
                          value={editData.class_number}
                          onChange={(e) => setEditData((d) => ({ ...d, class_number: Number(e.target.value) }))}
                          className="flex h-8 w-16 rounded-md border border-input bg-transparent px-2 text-sm"
                        />
                      </TableCell>
                      <TableCell>
                        <input
                          type="number"
                          value={editData.year}
                          onChange={(e) => setEditData((d) => ({ ...d, year: Number(e.target.value) }))}
                          className="flex h-8 w-20 rounded-md border border-input bg-transparent px-2 text-sm"
                        />
                      </TableCell>
                      <TableCell>
                        <select
                          value={editData.teacherId}
                          onChange={(e) => setEditData((d) => ({ ...d, teacherId: e.target.value }))}
                          className="flex h-8 rounded-md border border-input bg-transparent px-2 text-sm"
                        >
                          <option value="">미배정</option>
                          {teachers.map((t) => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                          ))}
                        </select>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" onClick={() => handleEditSave(c.id)} disabled={isPending}>저장</Button>
                          <Button size="sm" variant="outline" onClick={() => setEditId(null)}>취소</Button>
                        </div>
                        {rowMsg[c.id] && (
                          <p className={`text-xs mt-1 ${rowMsg[c.id].type === "success" ? "text-green-600" : "text-destructive"}`}>
                            {rowMsg[c.id].text}
                          </p>
                        )}
                      </TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell>{c.class_number}반</TableCell>
                      <TableCell>{c.year}</TableCell>
                      <TableCell>{c.profiles?.name ?? "미배정"}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" onClick={() => startEdit(c)}>수정</Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(c.id)}
                            disabled={isPending}
                          >
                            삭제
                          </Button>
                        </div>
                        {rowMsg[c.id] && (
                          <p className={`text-xs mt-1 ${rowMsg[c.id].type === "success" ? "text-green-600" : "text-destructive"}`}>
                            {rowMsg[c.id].text}
                          </p>
                        )}
                      </TableCell>
                    </>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
