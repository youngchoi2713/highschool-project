import Link from "next/link";

export const metadata = {
  title: "개인정보처리방침 | 교칙위반 관리",
};

export default function PrivacyPage() {
  const updated = "2026년 3월 3일";

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <Link href="/" className="text-sm text-muted-foreground hover:underline">← 홈으로</Link>

      <h1 className="mt-4 text-3xl font-bold">개인정보처리방침</h1>
      <p className="mt-2 text-sm text-muted-foreground">최종 수정일: {updated}</p>

      <div className="mt-8 space-y-8 text-sm leading-7">
        <section>
          <h2 className="text-lg font-semibold mb-2">1. 수집하는 개인정보</h2>
          <p>본 서비스는 다음과 같은 개인정보를 수집합니다.</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>교사: 이메일 주소, 이름</li>
            <li>학생: 이름, 학번(번호) — 계정 없음, 위반 기록 관리 목적으로만 보관</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">2. 개인정보 수집 및 이용 목적</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>교사 계정 로그인 및 인증</li>
            <li>교칙 위반 기록 등록 및 조회</li>
            <li>학교별 학생·교사 관리</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">3. 개인정보 보유 및 이용 기간</h2>
          <p>
            개인정보는 서비스 이용 계약 종료 시까지 보관하며, 탈퇴 또는 학교 계약 해지 시
            지체 없이 파기합니다. 단, 관련 법령에 따라 보존이 필요한 경우 해당 기간 동안 보관합니다.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">4. 개인정보의 제3자 제공</h2>
          <p>
            본 서비스는 수집한 개인정보를 원칙적으로 외부에 제공하지 않습니다.
            단, 법령에 의한 경우는 예외로 합니다.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">5. 쿠키(Cookie) 사용</h2>
          <p>
            본 서비스는 로그인 세션 유지를 위해 쿠키를 사용합니다.
            브라우저 설정에서 쿠키 저장을 거부할 수 있으나, 이 경우 서비스 이용이 제한될 수 있습니다.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">6. 광고</h2>
          <p>
            본 서비스는 Google AdSense를 통해 광고를 제공할 수 있습니다.
            Google은 광고 제공을 위해 쿠키를 사용할 수 있으며, 이는{" "}
            <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer"
              className="text-primary underline">Google 개인정보처리방침</a>의 적용을 받습니다.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">7. 개인정보 보호책임자</h2>
          <p>
            개인정보 관련 문의는 서비스 운영자에게 연락하시기 바랍니다.
          </p>
        </section>
      </div>
    </div>
  );
}
