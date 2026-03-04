"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createStudent, updateStudent, deleteStudent } from "../actions";
import StudentCsvUpload from "./StudentCsvUpload";
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

type Student = {
  id: string;
  student_number: number;
  name: string;
  class_id: string;
  classes: { id: string; grade: number; class_number: number } | null;
};

type ClassOption = { id: string; grade: number; class_number: number };
type Msg = { type: "success" | "error"; text: string };

type Props = {
  students: Student[];
  classes: ClassOption[];
  schoolId: string;
};

export default function StudentsClient({ students, classes, schoolId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [addMsg, setAddMsg] = useState<Msg | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editData, setEditData] = useState({ name: "", student_number: 1, class_id: "" });
  const [rowMsg, setRowMsg] = useState<Record<string, Msg>>({});

  // Filters
  const [filterGrade, setFilterGrade] = useState<number | "">("");
  const [filterClass, setFilterClass] = useState<number | "">("");

  function setRow(id: string, msg: Msg) {
    setRowMsg((prev) => ({ ...prev, [id]: msg }));
  }

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const cls = s.classes as any;
      if (filterGrade !== "" && cls?.grade !== filterGrade) return false;
      if (filterClass !== "" && cls?.class_number !== filterClass) return false;
      return true;
    });
  }, [students, filterGrade, filterClass]);

  const uniqueGrades = useMemo(
    () => Array.from(new Set(classes.map((c) => c.grade))).sort(),
    [classes]
  );

  const classesForGrade = useMemo(
    () => filterGrade !== "" ? classes.filter((c) => c.grade === filterGrade) : [],
    [classes, filterGrade]
  );

  function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAddMsg(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await createStudent(fd);
      if (res.error) {
        setAddMsg({ type: "error", text: res.error });
      } else {
        setAddMsg({ type: "success", text: "학생이 등록되었습니다." });
        (e.target as HTMLFormElement).reset();
        router.refresh();
      }
    });
  }

  function startEdit(s: Student) {
    setEditId(s.id);
    setEditData({ name: s.name, student_number: s.student_number, class_id: s.class_id });
    setRowMsg((prev) => { const n = { ...prev }; delete n[s.id]; return n; });
  }

  function handleEditSave(studentId: string) {
    startTransition(async () => {
      const res = await updateStudent(studentId, editData);
      if (res.error) {
        setRow(studentId, { type: "error", text: res.error });
      } else {
        setEditId(null);
        router.refresh();
      }
    });
  }

  function handleDelete(studentId: string, name: string) {
    if (!confirm(`${name} 학생을 삭제하시겠습니까?`)) return;
    startTransition(async () => {
      const res = await deleteStudent(studentId);
      if (res.error) {
        setRow(studentId, { type: "error", text: res.error });
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* 개별 등록 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">학생 개별 등록</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAdd} className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1">
              <label className="text-sm font-medium">학급</label>
              <select
                name="class_id"
                required
                className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
              >
                <option value="">선택</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.grade}학년 {c.class_number}반</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">번호</label>
              <input
                name="student_number"
                type="number"
                min={1}
                max={50}
                required
                className="flex h-9 w-20 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">이름</label>
              <input
                name="name"
                type="text"
                required
                placeholder="홍길동"
                className="flex h-9 w-28 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
              />
            </div>
            <Button type="submit" disabled={isPending}>등록</Button>
          </form>
          {addMsg && (
            <p className={`mt-2 text-sm ${addMsg.type === "success" ? "text-green-600" : "text-destructive"}`}>
              {addMsg.text}
            </p>
          )}
        </CardContent>
      </Card>

      {/* CSV 일괄 등록 */}
      <StudentCsvUpload schoolId={schoolId} />

      {/* 학생 목록 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              전체 학생 ({filteredStudents.length}명{students.length !== filteredStudents.length ? ` / ${students.length}명` : ""})
            </CardTitle>
            {/* 필터 */}
            <div className="flex gap-2">
              <select
                value={filterGrade}
                onChange={(e) => {
                  setFilterGrade(e.target.value === "" ? "" : Number(e.target.value));
                  setFilterClass("");
                }}
                className="flex h-8 rounded-md border border-input bg-transparent px-2 text-sm"
              >
                <option value="">전체 학년</option>
                {uniqueGrades.map((g) => (
                  <option key={g} value={g}>{g}학년</option>
                ))}
              </select>
              {filterGrade !== "" && (
                <select
                  value={filterClass}
                  onChange={(e) => setFilterClass(e.target.value === "" ? "" : Number(e.target.value))}
                  className="flex h-8 rounded-md border border-input bg-transparent px-2 text-sm"
                >
                  <option value="">전체 반</option>
                  {classesForGrade.map((c) => (
                    <option key={c.id} value={c.class_number}>{c.class_number}반</option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>학급</TableHead>
              <TableHead>번호</TableHead>
              <TableHead>이름</TableHead>
              <TableHead>관리</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStudents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  {students.length === 0 ? "등록된 학생이 없습니다." : "해당 조건의 학생이 없습니다."}
                </TableCell>
              </TableRow>
            ) : (
              filteredStudents.map((s) => {
                const cls = s.classes as any;
                return (
                  <TableRow key={s.id}>
                    {editId === s.id ? (
                      <>
                        <TableCell>
                          <select
                            value={editData.class_id}
                            onChange={(e) => setEditData((d) => ({ ...d, class_id: e.target.value }))}
                            className="flex h-8 rounded-md border border-input bg-transparent px-2 text-sm"
                          >
                            {classes.map((c) => (
                              <option key={c.id} value={c.id}>{c.grade}학년 {c.class_number}반</option>
                            ))}
                          </select>
                        </TableCell>
                        <TableCell>
                          <input
                            type="number"
                            min={1}
                            max={50}
                            value={editData.student_number}
                            onChange={(e) => setEditData((d) => ({ ...d, student_number: Number(e.target.value) }))}
                            className="flex h-8 w-16 rounded-md border border-input bg-transparent px-2 text-sm"
                          />
                        </TableCell>
                        <TableCell>
                          <input
                            value={editData.name}
                            onChange={(e) => setEditData((d) => ({ ...d, name: e.target.value }))}
                            className="flex h-8 w-24 rounded-md border border-input bg-transparent px-2 text-sm"
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="sm" onClick={() => handleEditSave(s.id)} disabled={isPending}>저장</Button>
                            <Button size="sm" variant="outline" onClick={() => setEditId(null)}>취소</Button>
                          </div>
                          {rowMsg[s.id] && (
                            <p className={`text-xs mt-1 ${rowMsg[s.id].type === "success" ? "text-green-600" : "text-destructive"}`}>
                              {rowMsg[s.id].text}
                            </p>
                          )}
                        </TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell>{cls?.grade}학년 {cls?.class_number}반</TableCell>
                        <TableCell>{s.student_number}번</TableCell>
                        <TableCell>{s.name}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline" onClick={() => startEdit(s)}>수정</Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDelete(s.id, s.name)}
                              disabled={isPending}
                            >
                              삭제
                            </Button>
                          </div>
                          {rowMsg[s.id] && (
                            <p className={`text-xs mt-1 ${rowMsg[s.id].type === "success" ? "text-green-600" : "text-destructive"}`}>
                              {rowMsg[s.id].text}
                            </p>
                          )}
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
