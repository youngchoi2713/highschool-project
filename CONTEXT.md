# 프로젝트 컨텍스트 (AI 작업용)

> 이 파일은 Claude / Codex 등 AI가 프로젝트를 이어받아 작업할 때 참고하는 문서입니다.
> 코드 작성 전 반드시 이 파일을 먼저 읽으세요.

---

## 프로젝트 개요

한국 고등학교 교칙 위반(전자기기 사용·교복 위반)을 종이 대신 웹으로 기록·관리하는 SaaS.
장기적으로 멀티 학교 플랫폼으로 확장하며 Google AdSense로 수익화 예정.

- **MVP**: 데스크톱 웹 우선, 모바일은 낮은 우선순위
- **현재 타겟**: 용호고등학교 (1개 학교)
- **배포**: Vercel Hobby (무료) + Supabase 무료 티어

---

## 기술 스택

```
Next.js 14 (App Router) + TypeScript
Tailwind CSS + shadcn/ui
Supabase (PostgreSQL + Auth + RLS)
Vercel (배포)
```

---

## Supabase 정보

- **프로젝트 URL**: `https://nguhqptxczdrwcbllqml.supabase.co`
- **Region**: Northeast Asia (ap-northeast-1)
- **환경변수**: `.env.local` (gitignore됨 — 절대 커밋 금지)

---

## 데이터베이스 스키마

```sql
-- 학교 (멀티테넌시 루트)
schools (id uuid PK, name, slug, address, contact_email, created_at)

-- 교사 프로필 (auth.users 와 1:1)
profiles (
  id uuid PK → auth.users.id,
  school_id uuid → schools.id,
  name text,
  role text,       -- 'super_admin' | 'school_admin' | 'homeroom' | 'subject'
  email text,
  created_at
)

-- 학급
classes (
  id uuid PK,
  school_id uuid,
  grade int,           -- 1·2·3학년
  class_number int,    -- 반 번호
  year int,            -- 학년도 (예: 2025)
  homeroom_teacher_id uuid → profiles.id
)

-- 학생
students (
  id uuid PK,
  class_id uuid → classes.id,
  school_id uuid,
  student_number int,  -- 번호
  name text,
  is_active boolean    -- 전학·졸업 시 false
)

-- 위반 유형 (참조 테이블)
violation_types (id uuid PK, code text UNIQUE, label text)
-- 초기 데이터: 'electronic_device'(전자기기), 'uniform'(교복 위반)

-- 위반 기록
violations (
  id uuid PK,
  student_id uuid → students.id,
  school_id uuid,
  submitted_by uuid → profiles.id,   -- 제출한 교과 교사
  violation_type_id uuid → violation_types.id,
  violation_date date,
  period int,    -- 교시 (1~9)
  memo text,
  created_at
)
```

### RLS 정책 원칙
- 모든 테이블에 `school_id` 컬럼 → 학교별 완전 격리
- 교과 교사: violations INSERT만 허용
- 담임 교사: 본인 반 violations SELECT만 허용
- 학교관리자: 해당 school_id 전체 CRUD

---

## 보안 패턴 (필수 준수)

### 1. middleware.ts — app_metadata만 신뢰
```ts
// ✅ 올바름: app_metadata는 서버/관리자만 수정 가능
const role = user.app_metadata?.role as AppRole | null;
const schoolId = user.app_metadata?.school_id as string | null;

// ❌ 금지: user_metadata는 사용자가 수정 가능
const role = user.user_metadata?.role;  // 절대 금지
```

### 2. Server Action — 항상 서버에서 schoolId 검증
```ts
// ✅ 올바름
const schoolId = user.app_metadata?.school_id;
if (!schoolId) return { error: "학교 정보 없음" };
```

### 3. createAdminClient — Server Action 전용
```ts
// lib/supabase/server.ts 의 createAdminClient()는
// RLS를 우회하므로 반드시 서버 전용 코드에서만 사용
// Client Component에서 절대 사용 금지
```

---

## 접근 제어 흐름 (middleware.ts)

```
요청 → 세션 갱신
  ↓
비로그인? → /login 리다이렉트 (공개 경로 제외)
  ↓
school_id 없음? → /pending 리다이렉트
  ↓
역할 확인:
  subject·homeroom → /submit, /violations 허용
  school_admin     → /admin 허용
  super_admin      → /super-admin 허용
  그 외 경로       → / 리다이렉트
```

**공개 경로**: `/`, `/login`, `/register`, `/privacy`, `/terms`, `/pending`

---

## 파일 구조 상세

```
app/
├── login/page.tsx          Client Component — 로그인 폼
├── pending/page.tsx        Server Component — 미승인 대기
├── submit/page.tsx         Server Component — 위반 제출 (교과 교사용)
├── violations/page.tsx     Server Component — 이력 조회 (담임용)
├── admin/
│   ├── layout.tsx          사이드바 레이아웃 + 로그아웃
│   ├── page.tsx            대시보드 (학생/교사/위반 통계)
│   ├── classes/page.tsx    학급 추가 + 담임 배정
│   ├── teachers/page.tsx   교사 승인 + 역할 변경
│   └── students/page.tsx   학생 개별/CSV 일괄 등록
├── super-admin/            (미구현)
├── api/ping/route.ts       Vercel Cron — Supabase 비활성 방지
├── privacy/page.tsx        개인정보처리방침 (AdSense 필수)
├── terms/page.tsx          이용약관 (AdSense 필수)
├── layout.tsx              루트 레이아웃
├── page.tsx                랜딩 페이지 (히어로 + 기능 소개 + CTA)
└── globals.css             shadcn CSS 변수

features/violations/
├── actions.ts              submitViolation() Server Action
├── queries.ts              getMyClasses, getStudentsByClass, getViolationTypes, getViolationsByHomeroom
└── components/
    └── ViolationForm.tsx   위반 제출 폼 (Client Component)

features/admin/
├── actions.ts              createClass, assignHomeroom, approveTeacher, updateTeacherRole, createStudent, bulkCreateStudents
├── queries.ts              getAdminStats, getClasses, getTeachers, getPendingTeachers, getStudents
└── components/
    └── StudentCsvUpload.tsx  클라이언트 CSV 파서 + 미리보기 + 업로드

lib/
├── supabase/
│   ├── server.ts           createClient() + createAdminClient()
│   └── client.ts           createBrowserClient()
└── utils.ts                cn() 유틸

vercel.json                 Cron Job: /api/ping 매일 09:00 KST 호출

components/ui/              shadcn 컴포넌트 (button, input, label, select, card, table, badge)
middleware.ts               인증·역할 접근 제어
```

---

## 구현 현황

| STEP | 내용 | 상태 |
|------|------|------|
| 0 | Supabase MCP 설치 | ✅ (PowerShell만, VS Code 미연결) |
| 1 | 외부 서비스 계정 (GitHub·Supabase·Vercel) | ✅ |
| 2 | DB 스키마 (SQL Editor 직접 실행) | ✅ |
| 3 | Next.js 프로젝트 초기화 | ✅ |
| 4 | 핵심 기능 (로그인·위반제출·이력조회) | ✅ |
| 5 | 관리자 화면 (/admin) | ✅ |
| 6 | 랜딩 페이지 + /privacy + /terms + Vercel Cron | ✅ |
| 7 | Vercel 배포 | ⏳ 다음 |
| 8 | 초기 데이터 입력 (학교·학급·학생·교사) | 대기 |
| 9 | AdSense 신청 | 대기 |

---

## 다음 구현 목표 — STEP 7: Vercel 배포

### 순서
1. GitHub 저장소: https://github.com/youngchoi2713/highschool-project (준비 완료)
2. Vercel → "Add New Project" → GitHub 저장소 연결
3. 환경변수 입력 (3개):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Deploy → 도메인 확인

### 배포 후 STEP 8 (초기 데이터)
- Supabase SQL Editor에서 용호고등학교 schools 레코드 INSERT
- super_admin 계정 생성 → app_metadata 수동 설정
- school_admin 계정 생성 및 승인
- 학급 생성 (1~3학년, 각 반)
- 교사 계정 생성 및 역할 배정
- 학생 CSV 업로드

---

## 코딩 컨벤션

- **Server Component 기본**: 데이터 패칭은 서버에서
- **Client Component**: 폼, 인터랙션이 필요한 경우만 `"use client"` 추가
- **Server Action**: `"use server"` 지시어, 파일 최상단 또는 함수 내부
- **에러 처리**: `{ error: string }` 또는 `{ success: true }` 반환 패턴
- **한국어 UI**: 모든 사용자 노출 텍스트는 한국어
- **타입**: `any` 최소화, Supabase 자동 생성 타입 활용 권장

---

## GitHub & 배포

- **Repository**: https://github.com/youngchoi2713/highschool-project
- **Branch 전략**: main 브랜치에 직접 커밋 (MVP 단계)
- **커밋 컨벤션**: `feat:`, `fix:`, `chore:` 접두사 사용
- **Vercel**: 미연결 (STEP 7에서 연결 예정)
- **환경변수 (Vercel에 등록 필요)**:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
