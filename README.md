# 교칙 위반 관리 시스템

한국 고등학교의 교칙 위반(전자기기·교복) 기록을 디지털화하는 멀티 학교 SaaS 웹 서비스입니다.

## 기술 스택

| 레이어 | 기술 |
|--------|------|
| 프레임워크 | Next.js 14 (App Router) |
| 언어 | TypeScript |
| 스타일 | Tailwind CSS + shadcn/ui |
| 데이터베이스 | Supabase (PostgreSQL + Auth + RLS) |
| 배포 | Vercel (Hobby 무료) |
| 광고 | Google AdSense (예정) |

## 로컬 실행 방법

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경변수 설정

`.env.local.example`을 복사해 `.env.local`을 만들고 값을 입력합니다.

```bash
cp .env.local.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 3. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 접속

## 폴더 구조

```
├── app/
│   ├── login/            # 로그인 페이지
│   ├── pending/          # 학교 미배정 대기 화면
│   ├── submit/           # [교과] 위반 제출 페이지
│   ├── violations/       # [담임] 위반 이력 조회
│   ├── admin/            # [학교관리자] 관리 화면 (예정)
│   ├── super-admin/      # [플랫폼관리자] 전체 현황 (예정)
│   ├── api/ping/         # Supabase 비활성 방지 (예정)
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
│
├── features/
│   └── violations/
│       ├── actions.ts    # Server Actions
│       ├── queries.ts    # DB 조회 함수
│       └── components/
│           └── ViolationForm.tsx
│
├── components/
│   └── ui/               # shadcn/ui 컴포넌트
│
├── lib/
│   ├── supabase/
│   │   ├── server.ts     # createClient / createAdminClient
│   │   └── client.ts     # createBrowserClient
│   └── utils.ts
│
└── middleware.ts          # 인증 + 역할 기반 접근 제어
```

## 사용자 역할

| 역할 | 설명 | 접근 가능 경로 |
|------|------|---------------|
| `subject` | 교과 교사 | `/submit` |
| `homeroom` | 담임 교사 | `/violations` |
| `school_admin` | 학교 관리자 | `/admin` |
| `super_admin` | 플랫폼 관리자 | `/super-admin` |

## 구현 현황

- [x] DB 스키마 (Supabase)
- [x] Next.js 프로젝트 초기화
- [x] 인증 + 역할 기반 middleware
- [x] 로그인 페이지
- [x] 위반 제출 페이지 (교과 교사)
- [x] 위반 이력 조회 페이지 (담임 교사)
- [ ] 관리자 화면 (학교관리자)
- [ ] 랜딩 페이지 + AdSense
- [ ] Vercel 배포
