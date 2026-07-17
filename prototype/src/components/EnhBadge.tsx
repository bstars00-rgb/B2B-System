/**
 * 고도화 표기 배지 — 닷비즈 원본에 없는(또는 개선된) 기능임을 화면에 표시.
 * 기획자 설명용: 마우스 오버 시 어떤 고도화인지 툴팁으로 안내.
 * 헤더의 ✨ 토글로 전체 표시/숨김 (body.enh-off 클래스 — index.css).
 */
export default function EnhBadge({ note }: { note: string }) {
  return (
    <span
      className="enh-badge inline-flex shrink-0 cursor-help items-center rounded-sm bg-violet-100 px-1 py-px text-[9px] font-bold leading-tight text-violet-600"
      title={`닷비즈 대비 고도화: ${note}`}
    >
      UP
    </span>
  );
}
