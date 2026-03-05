"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  registerTeacher,
  getSchools,
  getClassesBySchool,
} from "@/features/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type School = { id: string; name: string };
type ClassOption = { id: string; grade: number; class_number: number };

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [phone, setPhone] = useState("");
  const [subject, setSubject] = useState("");
  const [role, setRole] = useState<"homeroom" | "subject">("subject");
  const [schoolId, setSchoolId] = useState("");
  const [classId, setClassId] = useState("");
  const [schools, setSchools] = useState<School[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getSchools().then(setSchools);
  }, []);

  useEffect(() => {
    if (!schoolId) {
      setClasses([]);
      setClassId("");
      return;
    }

    getClassesBySchool(schoolId).then((rows) => {
      setClasses(rows);
      if (!rows.some((c) => c.id === classId)) setClassId("");
    });
  }, [schoolId, classId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (password.length < 8) {
      setError("비밀번호는 8자 이상이어야 합니다.");
      return;
    }
    if (password !== passwordConfirm) {
      setError("비밀번호 확인이 일치하지 않습니다.");
      return;
    }
    if (!schoolId) {
      setError("학교를 선택해 주세요.");
      return;
    }
    if (role === "homeroom" && !classId) {
      setError("담임은 담당 학급을 선택해야 합니다.");
      return;
    }

    setLoading(true);
    const registerResult = await registerTeacher({
      name,
      email,
      password,
      phone,
      subject,
      schoolId,
      role,
      classId: role === "homeroom" ? classId : undefined,
    });

    if (registerResult.error) {
      setError(registerResult.error);
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setSuccess("가입이 완료되었습니다. 로그인 후 이용해 주세요.");
      setLoading(false);
      return;
    }

    router.push(role === "homeroom" ? "/violations" : "/submit");
  }

  const selectClass =
    "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">교사 회원가입</CardTitle>
          <CardDescription>승인 없이 바로 이용 가능합니다</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="name">이름 *</Label>
              <Input
                id="name"
                type="text"
                placeholder="홍길동"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="school">학교 *</Label>
              <select
                id="school"
                value={schoolId}
                onChange={(e) => setSchoolId(e.target.value)}
                className={selectClass}
                required
              >
                <option value="">학교를 선택하세요</option>
                {schools.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="role">역할 *</Label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value as "homeroom" | "subject")}
                className={selectClass}
              >
                <option value="subject">교과</option>
                <option value="homeroom">담임</option>
              </select>
            </div>
            {role === "homeroom" && (
              <div className="space-y-1">
                <Label htmlFor="classId">담당 학급 *</Label>
                <select
                  id="classId"
                  value={classId}
                  onChange={(e) => setClassId(e.target.value)}
                  className={selectClass}
                  required
                >
                  <option value="">학급을 선택하세요</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.grade}학년 {c.class_number}반
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="space-y-1">
              <Label htmlFor="email">이메일 *</Label>
              <Input
                id="email"
                type="email"
                placeholder="teacher@school.kr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="password">비밀번호 * (8자 이상)</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="passwordConfirm">비밀번호 확인 *</Label>
              <Input
                id="passwordConfirm"
                type="password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="phone">전화번호</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="010-0000-0000"
                value={phone}
                onChange={(e) => setPhone(formatPhone(e.target.value))}
                maxLength={13}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="subject">담당 과목</Label>
              <Input
                id="subject"
                type="text"
                placeholder="수학, 영어, 체육 등"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            {success && <p className="text-sm text-green-600">{success}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "가입 중..." : "가입하기"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              이미 계정이 있으신가요?{" "}
              <Link href="/login" className="text-primary hover:underline">
                로그인
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
