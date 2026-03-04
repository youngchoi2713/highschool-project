"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { bulkCreateStudentsWithAutoClass } from "../actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ParsedRow = { grade: number; classNum: number; studentNumber: number; name: string };

type Props = {
  schoolId: string;
  year?: number;
};

export default function StudentCsvUpload({ schoolId, year }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [preview, setPreview] = useState<ParsedRow[]>([]);
  const [error, setError] = useState("");
  const [result, setResult] = useState("");
  const [targetYear] = useState(year ?? new Date().getFullYear());

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    setError("");
    setResult("");
    setPreview([]);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.trim().split("\n").map((l) => l.trim()).filter(Boolean);
      const dataLines = /^\d/.test(lines[0]) ? lines : lines.slice(1);

      const rows: ParsedRow[] = [];
      const errors: string[] = [];

      dataLines.forEach((line, idx) => {
        const cols = line.split(",").map((c) => c.trim());
        if (cols.length < 4) {
          errors.push(`${idx + 1}행: 열 수 부족`);
          return;
        }
        const [gradeStr, classStr, numStr, name] = cols;
        const grade = Number(gradeStr);
        const classNum = Number(classStr);
        const studentNumber = Number(numStr);

        if (!grade || !classNum || !studentNumber || !name) {
          errors.push(`${idx + 1}행: 빈 값 있음`);
          return;
        }
        rows.push({ grade, classNum, studentNumber, name });
      });

      if (errors.length > 0) {
        setError(errors.slice(0, 5).join(" | ") + (errors.length > 5 ? ` 외 ${errors.length - 5}건` : ""));
        return;
      }
      setPreview(rows);
    };
    reader.readAsText(file, "utf-8");
  }

  function handleUpload() {
    startTransition(async () => {
      const res = await bulkCreateStudentsWithAutoClass(preview, schoolId, targetYear);
      if (res.error) {
        setError(res.error);
      } else {
        setResult(`${res.count}명 등록 완료! (없는 학급은 자동으로 생성됨)`);
        setPreview([]);
        router.refresh();
      }
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
          <code className="bg-muted px-1 rounded">학년,반,번호,이름</code> (헤더 행 있어도 됨)
        </p>
        <p className="text-xs text-muted-foreground">
          예: <code className="bg-muted px-1 rounded">1,1,1,홍길동</code>{" "}
          — DB에 없는 학급은 자동으로 생성됩니다 (학년도 {targetYear})
        </p>

        <input
          type="file"
          accept=".csv,text/csv"
          onChange={handleFile}
          className="block w-full text-sm file:mr-3 file:rounded-md file:border file:px-3 file:py-1 file:text-sm"
        />

        {error && <p className="text-sm text-destructive">{error}</p>}
        {result && <p className="text-sm text-green-600">{result}</p>}

        {preview.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">{preview.length}명 파싱 완료 — 확인 후 업로드</p>
            <div className="max-h-40 overflow-auto rounded border text-xs">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-2 py-1 text-left">학급</th>
                    <th className="px-2 py-1 text-left">번호</th>
                    <th className="px-2 py-1 text-left">이름</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.slice(0, 20).map((r, i) => (
                    <tr key={i} className="border-t">
                      <td className="px-2 py-1">{r.grade}학년 {r.classNum}반</td>
                      <td className="px-2 py-1">{r.studentNumber}</td>
                      <td className="px-2 py-1">{r.name}</td>
                    </tr>
                  ))}
                  {preview.length > 20 && (
                    <tr>
                      <td colSpan={3} className="px-2 py-1 text-muted-foreground">
                        ...외 {preview.length - 20}명
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <Button onClick={handleUpload} disabled={isPending}>
              {isPending ? "등록 중..." : `${preview.length}명 등록`}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
