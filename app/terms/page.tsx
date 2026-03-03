import Link from "next/link";

export const metadata = {
  title: "이용약관 | 교칙위반 관리",
};

export default function TermsPage() {
  const updated = "2026년 3월 3일";

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <Link href="/" className="text-sm text-muted-foreground hover:underline">← 홈으로</Link>

      <h1 className="mt-4 text-3xl font-bold">이용약관</h1>
      <p className="mt-2 text-sm text-muted-foreground">최종 수정일: {updated}</p>

      <div className="mt-8 space-y-8 text-sm leading-7">
        <section>
          <h2 className="text-lg font-semibold mb-2">제1조 (목적)</h2>
          <p>
            본 약관은 교칙위반 관리 시스템(이하 &ldquo;서비스&rdquo;)의 이용 조건 및 절차,
            이용자와 운영자의 권리·의무 및 책임 사항을 규정함을 목적으로 합니다.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">제2조 (서비스 내용)</h2>
          <p>본 서비스는 학교 교칙 위반 사항을 디지털로 기록·관리하는 기능을 제공합니다.</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>교칙 위반 기록 등록 및 조회</li>
            <li>학급·학생·교사 관리</li>
            <li>위반 현황 통계 제공</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">제3조 (회원 가입 및 계정)</h2>
          <p>
            서비스 이용을 위해 이메일과 비밀번호로 계정을 생성할 수 있습니다.
            가입 후 학교 관리자의 승인을 받아야 서비스를 이용할 수 있습니다.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">제4조 (이용자의 의무)</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>타인의 정보를 도용하거나 허위 정보를 등록하지 않습니다.</li>
            <li>서비스를 학교 교육 목적 외의 용도로 사용하지 않습니다.</li>
            <li>학생 개인정보를 서비스 외부로 유출하지 않습니다.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">제5조 (서비스 제공 및 변경)</h2>
          <p>
            운영자는 서비스를 안정적으로 제공하기 위해 노력하나, 시스템 점검·장애 등의
            사유로 일시적으로 서비스가 중단될 수 있습니다.
            서비스 내용은 사전 공지 후 변경될 수 있습니다.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">제6조 (책임의 한계)</h2>
          <p>
            운영자는 무료 서비스에서 발생한 데이터 손실, 서비스 장애 등에 대해
            법적 책임을 지지 않습니다. 중요 데이터는 별도로 백업하시기 바랍니다.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">제7조 (약관 변경)</h2>
          <p>
            본 약관은 필요에 따라 변경될 수 있으며, 변경 시 서비스 내 공지를 통해 안내합니다.
          </p>
        </section>
      </div>
    </div>
  );
}
