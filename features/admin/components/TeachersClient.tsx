"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  updateTeacherRole,
  updateTeacher,
  deleteTeacher,
  createTeacher,
} from "../actions";
import TeacherCsvUpload from "./TeacherCsvUpload";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ROLE_LABELS: Record<string, string> = {
  subject: "교과",
  homeroom: "담임",
  school_admin: "학교관리자",
  super_admin: "플랫폼관리자",
};

const ROLE_COLORS: Record<string, "default" | "secondary" | "outline"> = {
  subject: "secondary",
  homeroom: "default",
  school_admin: "outline",
};

type Teacher = {
  id: string;
  name: string | null;
  email: string | null;
  role: string | null;
  phone: string | null;
  subject: string | null;
  homeroom_class: string | null;
};

type Msg = { type: "success" | "error"; text: string };

type ClassOption = { id: string; grade: number; class_number: number };

type Props = {
  teachers: Teacher[];
  schoolId: string;
  classes: ClassOption[];
};

export default function TeachersClient({ teachers, schoolId, classes }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [localTeachers, setLocalTeachers] = useState<Teacher[]>(teachers);

  // server refresh 시 로컬 상태 동기화
  useEffect(() => { setLocalTeachers(teachers); }, [teachers]);

  // Add teacher form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({
    name: "", email: "", password: "", phone: "", subject: "",
    role: "subject" as "homeroom" | "subject" | "school_admin",
    classId: "",
  });
  const [addMsg, setAddMsg] = useState<Msg | null>(null);

  // Row edit state
  const [editId, setEditId] = useState<string | null>(null);
  const [editData, setEditData] = useState({ name: "", phone: "", subject: "" });
  const [rowMsg, setRowMsg] = useState<Record<string, Msg>>({});

  function setRow(id: string, msg: Msg) {
    setRowMsg((prev) => ({ ...prev, [id]: msg }));
  }

  function handleAddTeacher(e: React.FormEvent) {
    e.preventDefault();
    setAddMsg(null);
    startTransition(async () => {
      const res = await createTeacher(addForm);
      if (res.error) {
        setAddMsg({ type: "error", text: res.error });
      } else {
        setAddMsg({ type: "success", text: "교사가 등록되었습니다." });
        if (res.data) {
          setLocalTeachers((prev) => [...prev, { ...res.data!, homeroom_class: null }]);
        }
        setAddForm({ name: "", email: "", password: "", phone: "", subject: "", role: "subject", classId: "" });
        setShowAddForm(false);
        router.refresh();
      }
    });
  }

  function startEdit(t: Teacher) {
    setEditId(t.id);
    setEditData({ name: t.name ?? "", phone: t.phone ?? "", subject: t.subject ?? "" });
    setRowMsg((prev) => { const n = { ...prev }; delete n[t.id]; return n; });
  }

  function handleEditSave(teacherId: string) {
    startTransition(async () => {
      const res = await updateTeacher(teacherId, editData);
      if (res.error) {
        setRow(teacherId, { type: "error", text: res.error });
      } else {
        setLocalTeachers((prev) =>
          prev.map((t) => (t.id === teacherId ? { ...t, ...editData } : t))
        );
        setEditId(null);
        router.refresh();
      }
    });
  }

  function handleRoleChange(teacherId: string, role: "homeroom" | "subject" | "school_admin") {
    startTransition(async () => {
      const res = await updateTeacherRole(teacherId, role);
      if (res.error) {
        setRow(teacherId, { type: "error", text: res.error });
      } else {
        setLocalTeachers((prev) =>
          prev.map((t) => (t.id === teacherId ? { ...t, role } : t))
        );
        setRow(teacherId, { type: "success", text: "역할 변경됨" });
        router.refresh();
      }
    });
  }

  function handleDelete(teacherId: string, name: string | null) {
    if (!confirm(`${name ?? "이 교사"}를 삭제하시겠습니까? 되돌릴 수 없습니다.`)) return;
    startTransition(async () => {
      const res = await deleteTeacher(teacherId);
      if (res.error) {
        setRow(teacherId, { type: "error", text: res.error });
      } else {
        setLocalTeachers((prev) => prev.filter((t) => t.id !== teacherId));
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* 교사 직접 추가 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">등록된 교사 ({localTeachers.length}명)</CardTitle>
          <Button size="sm" onClick={() => setShowAddForm((v) => !v)}>
            {showAddForm ? "닫기" : "+ 교사 추가"}
          </Button>
        </CardHeader>

        {showAddForm && (
          <CardContent className="border-b pb-6">
            <form onSubmit={handleAddTeacher} className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>이름 *</Label>
                <Input
                  placeholder="홍길동"
                  value={addForm.name}
                  onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label>이메일 *</Label>
                <Input
                  type="email"
                  placeholder="teacher@school.kr"
                  value={addForm.email}
                  onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label>초기 비밀번호 * (8자 이상)</Label>
                <Input
                  type="password"
                  value={addForm.password}
                  onChange={(e) => setAddForm((f) => ({ ...f, password: e.target.value }))}
                  required
                  minLength={8}
                />
              </div>
              <div className="space-y-1">
                <Label>역할 *</Label>
                <select
                  value={addForm.role}
                  onChange={(e) => setAddForm((f) => ({ ...f, role: e.target.value as "homeroom" | "subject" | "school_admin" }))}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                >
                  <option value="subject">교과 교사</option>
                  <option value="homeroom">담임 교사</option>
                  <option value="school_admin">학교 관리자</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label>전화번호</Label>
                <Input
                  placeholder="010-0000-0000"
                  value={addForm.phone}
                  onChange={(e) => setAddForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>담당 과목</Label>
                <Input
                  placeholder="수학, 영어 등"
                  value={addForm.subject}
                  onChange={(e) => setAddForm((f) => ({ ...f, subject: e.target.value }))}
                />
              </div>
              {addForm.role === "homeroom" && (
                <div className="space-y-1 col-span-2">
                  <Label>담당 학급 (선택)</Label>
                  <select
                    value={addForm.classId}
                    onChange={(e) => setAddForm((f) => ({ ...f, classId: e.target.value }))}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                  >
                    <option value="">학급 미지정</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.grade}학년 {c.class_number}반
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="col-span-2 flex items-center gap-3">
                <Button type="submit" disabled={isPending}>
                  {isPending ? "등록 중..." : "교사 등록"}
                </Button>
                {addMsg && (
                  <p className={`text-sm ${addMsg.type === "success" ? "text-green-600" : "text-destructive"}`}>
                    {addMsg.text}
                  </p>
                )}
              </div>
            </form>
          </CardContent>
        )}

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>이름</TableHead>
              <TableHead>이메일</TableHead>
              <TableHead>전화번호</TableHead>
              <TableHead>과목</TableHead>
              <TableHead>역할</TableHead>
              <TableHead>담당 반</TableHead>
              <TableHead>관리</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {localTeachers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  등록된 교사가 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              localTeachers.map((t) => (
                <TableRow key={t.id}>
                  {editId === t.id ? (
                    <>
                      <TableCell>
                        <input
                          value={editData.name}
                          onChange={(e) => setEditData((d) => ({ ...d, name: e.target.value }))}
                          className="flex h-8 w-24 rounded-md border border-input bg-transparent px-2 text-sm"
                        />
                      </TableCell>
                      <TableCell>{t.email}</TableCell>
                      <TableCell>
                        <input
                          value={editData.phone}
                          onChange={(e) => setEditData((d) => ({ ...d, phone: e.target.value }))}
                          className="flex h-8 w-32 rounded-md border border-input bg-transparent px-2 text-sm"
                          placeholder="010-0000-0000"
                        />
                      </TableCell>
                      <TableCell>
                        <input
                          value={editData.subject}
                          onChange={(e) => setEditData((d) => ({ ...d, subject: e.target.value }))}
                          className="flex h-8 w-24 rounded-md border border-input bg-transparent px-2 text-sm"
                          placeholder="수학"
                        />
                      </TableCell>
                      <TableCell>
                        <Badge variant={ROLE_COLORS[t.role ?? ""] ?? "secondary"}>
                          {ROLE_LABELS[t.role ?? ""] ?? t.role}
                        </Badge>
                      </TableCell>
                      <TableCell>{t.homeroom_class ?? "-"}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" onClick={() => handleEditSave(t.id)} disabled={isPending}>저장</Button>
                          <Button size="sm" variant="outline" onClick={() => setEditId(null)}>취소</Button>
                        </div>
                        {rowMsg[t.id] && (
                          <p className={`text-xs mt-1 ${rowMsg[t.id].type === "success" ? "text-green-600" : "text-destructive"}`}>
                            {rowMsg[t.id].text}
                          </p>
                        )}
                      </TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell>{t.name}</TableCell>
                      <TableCell>{t.email}</TableCell>
                      <TableCell>{t.phone ?? "-"}</TableCell>
                      <TableCell>{t.subject ?? "-"}</TableCell>
                      <TableCell>
                        <select
                          value={t.role ?? ""}
                          onChange={(e) => handleRoleChange(t.id, e.target.value as "homeroom" | "subject" | "school_admin")}
                          className="flex h-8 rounded-md border border-input bg-transparent px-2 text-sm"
                        >
                          <option value="subject">교과</option>
                          <option value="homeroom">담임</option>
                          <option value="school_admin">학교관리자</option>
                        </select>
                      </TableCell>
                      <TableCell>{t.role === "homeroom" ? (t.homeroom_class ?? "미배정") : "-"}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" onClick={() => startEdit(t)}>수정</Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(t.id, t.name)}
                            disabled={isPending}
                          >
                            삭제
                          </Button>
                        </div>
                        {rowMsg[t.id] && (
                          <p className={`text-xs mt-1 ${rowMsg[t.id].type === "success" ? "text-green-600" : "text-destructive"}`}>
                            {rowMsg[t.id].text}
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

      {/* CSV 일괄 등록 */}
      <TeacherCsvUpload schoolId={schoolId} />
    </div>
  );
}
