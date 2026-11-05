// 디자인: 스캐너 대기 표시 — 물건 목록을 서버에서 불러오는 동안에만 보인다(실제 대기 상태).
// 움직임은 보조일 뿐이라 같은 내용을 글자로도 알려 주고, 모션 줄이기 설정이면 선이 가운데에 멈춰 있다.
export default function ScanLoader({ message }: { message: string }) {
  return (
    <div role="status" className="surface-card flex flex-col gap-3 p-4">
      <div aria-hidden="true" className="scan-track">
        <div className="scan-line" />
      </div>
      <p className="text-sm text-muted">{message}</p>
    </div>
  );
}
