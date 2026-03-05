import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* 헤더 */}
      <header className="border-b">
        <div className="mx-auto max-w-5xl flex items-center justify-between px-6 py-4">
          <span className="text-lg font-bold">교칙위반 관리</span>
          <Link
            href="/login"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            로그인
          </Link>
        </div>
      </header>

      {/* 히어로 */}
      <section className="mx-auto max-w-5xl px-6 py-20 text-center">
        <h1 className="text-4xl font-bold leading-tight">
          교칙 위반, 더 이상<br />종이로 관리하지 마세요
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          전자기기 사용·교복 위반을 실시간으로 기록하고<br />
          담임 선생님이 언제든 조회할 수 있는 디지털 관리 시스템
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Link
            href="/register"
            className="rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            시작하기
          </Link>
          <a
            href="#features"
            className="rounded-md border px-6 py-3 text-sm font-medium hover:bg-accent"
          >
            기능 살펴보기
          </a>
        </div>
      </section>

      {/* 기능 소개 */}
      <section id="features" className="bg-gray-50 py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-2xl font-bold mb-10">주요 기능</h2>
          <div className="grid grid-cols-3 gap-6">
            {[
              {
                icon: "📝",
                title: "간편한 위반 기록",
                desc: "학급·학생을 선택하고 위반 유형을 고르면 끝. 수업 중에도 30초 안에 등록 가능합니다.",
              },
              {
                icon: "📊",
                title: "담임 전용 이력 조회",
                desc: "본인 반 학생의 위반 기록만 조회. 날짜·유형별 필터와 월별 통계를 제공합니다.",
              },
              {
                icon: "🏫",
                title: "학교 관리자 기능",
                desc: "학급·교사·학생을 한 곳에서 관리. CSV로 학생 명단을 일괄 등록할 수 있습니다.",
              },
            ].map((f) => (
              <div key={f.title} className="rounded-xl border bg-white p-6">
                <div className="text-3xl mb-3">{f.icon}</div>
                <h3 className="font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 text-center">
        <div className="mx-auto max-w-md">
          <h2 className="text-2xl font-bold">지금 바로 시작하세요</h2>
          <p className="mt-2 text-muted-foreground text-sm">무료로 이용 가능합니다.</p>
          <div className="mt-6 flex justify-center gap-3">
            <Link
              href="/register"
              className="inline-block rounded-md bg-primary px-8 py-3 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              회원가입
            </Link>
            <Link
              href="/login"
              className="inline-block rounded-md border px-8 py-3 text-sm font-medium hover:bg-accent"
            >
              로그인
            </Link>
          </div>
        </div>
      </section>

      {/* 푸터 */}
      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        <div className="flex justify-center gap-4">
          <Link href="/privacy" className="hover:underline">개인정보처리방침</Link>
          <Link href="/terms" className="hover:underline">이용약관</Link>
        </div>
        <p className="mt-2">© {new Date().getFullYear()} 교칙위반 관리 시스템</p>
      </footer>
    </div>
  );
}
