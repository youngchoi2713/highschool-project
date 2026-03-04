"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { bulkCreateTeachers } from "../actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ParsedRow = {
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  role: "homeroom" | "subject";
};

type CreatedResult = { email: string; tempPassword?: string; error?: string };

type Props = { schoolId: string };

export default function TeacherCsvUpload({ schoolId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [preview, setPreview] = useState<ParsedRow[]>([]);
  const [parseError, setParseError] = useState("");
  const [results, setResults] = useState<CreatedResult[]>([]);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    setParseError("");
    setPreview([]);
    setResults([]);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.trim().split("\n").map((l) => l.trim()).filter(Boolean);
      const dataLines = /^\d/.test(lines[0]) || lines[0].includes("@") ? lines : lines.slice(1);

      const rows: ParsedRow[] = [];
      const errors: string[] = [];

      dataLines.forEach((line, idx) => {
        const cols = line.split(",").map((c) => c.trim());
        if (cols.length < 5) {
          errors.push(`${idx + 1}행: 열 수 부족 (이름,이메일,전화번호,과목,역할 필요)`);
          return;
        }
        const [name, email, phone, subject, roleRaw] = cols;
        if (!name || !email || !roleRaw) {
          errors.push(`${idx + 1}행: 이름/이메일/역할 필수`);
          return;
        }
        if (!email.includes("@")) {
          errors.push(`${idx + 1}행: 이메일 형식 오류`);
          return;
        }
        const roleMap: Record<string, "homeroom" | "subject"> = {
          homeroom: "homeroom",
          subject: "subject",
          담임: "homeroom",
          교과: "subject",
        };
        const role = roleMap[roleRaw];
        if (!role) {
          errors.push(`${idx + 1}행: 역할은 담임/교과 또는 homeroom/subject`);
          return;
        }
        rows.push({ name, email, phone: phone || undefined, subject: subject || undefined, role });
      });

      if (errors.length > 0) {
        setParseError(errors.slice(0, 5).join(" | ") + (errors.length > 5 ? ` 외 ${errors.length - 5}건` : ""));
        return;
      }
      setPreview(rows);
    };
    reader.readAsText(file, "utf-8");
  }

  function handleUpload() {
    startTransition(async () => {
      const res = await bulkCreateTeachers(preview, schoolId);
      setResults([...res.created, ...res.failed]);
      setPreview([]);
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">CSV 일괄 등록</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          CSV 형식:{" "}
          <code className="bg-muted px-1 rounded">이름,이메일,전화번호,과목,역할</code>
        </p>
        <p className="text-xs text-muted-foreground">
          역할: <code className="bg-muted px-1 rounded">담임</code> 또는{" "}
          <code className="bg-muted px-1 rounded">교과</code> (또는 homeroom/subject){" "}
          / 전화번호·과목 생략 가능
        </p>
        <p className="text-xs text-muted-foreground">
          예: <code className="bg-muted px-1 rounded">홍길동,hong@school.kr,010-1234-5678,수학,담임</code>
        </p>

        <input
          type="file"
          accept=".csv,text/csv"
          onChange={handleFile}
          className="block w-full text-sm file:mr-3 file:rounded-md file:border file:px-3 file:py-1 file:text-sm"
        />

        {parseError && <p className="text-sm text-destructive">{parseError}</p>}

        {preview.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">{preview.length}명 파싱 완료 — 임시 비밀번호가 자동 생성됩니다</p>
            <div className="max-h-40 overflow-auto rounded border text-xs">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-2 py-1 text-left">이름</th>
                    <th className="px-2 py-1 text-left">이메일</th>
                    <th className="px-2 py-1 text-left">역할</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((r, i) => (
                    <tr key={i} className="border-t">
                      <td className="px-2 py-1">{r.name}</td>
                      <td className="px-2 py-1">{r.email}</td>
                      <td className="px-2 py-1">{r.role === "homeroom" ? "담임" : "교과"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Button onClick={handleUpload} disabled={isPending}>
              {isPending ? "등록 중..." : `${preview.length}명 등록`}
            </Button>
          </div>
        )}

        {results.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">등록 결과 — 임시 비밀번호를 교사에게 전달하세요</p>
            <div className="max-h-48 overflow-auto rounded border text-xs">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-2 py-1 text-left">이메일</th>
                    <th className="px-2 py-1 text-left">임시 비밀번호</th>
                    <th className="px-2 py-1 text-left">상태</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, i) => (
                    <tr key={i} className="border-t">
                      <td className="px-2 py-1">{r.email}</td>
                      <td className="px-2 py-1 font-mono">
                        {r.tempPassword ?? "-"}
                      </td>
                      <td className={`px-2 py-1 ${r.error ? "text-destructive" : "text-green-600"}`}>
                        {r.error ? "실패: " + r.error : "완료"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
