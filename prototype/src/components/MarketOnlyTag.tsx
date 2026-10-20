import { loadPortalLang, type PortalLang } from '../utils/portalLang';

/**
 * 마켓 전용요금 태그 — 기획: docs/plan/feature-market-only-rate-tag.md. **프로토타입 · 폐기 가능.**
 * ① 전용 태그(항상) ② 경쟁력 문구(같은 조건 일반 요금보다 기준% 이상 낮을 때만 · % 수치는 표시하지 않음). 문구는 포털 언어 설정을 따른다.
 */

const TEXT: Record<PortalLang, { tag: string; gap: string; tagTip: string; gapTip: string; filter: string }> = {
  en: {
    tag: 'Market Only',
    gap: 'Lower than regular rate',
    tagTip: 'Dotbiz Market exclusive rate. Not sold on the B2C site or API / OTA channels.',
    gapTip: 'Lower than the regular rates for the same room type, meal and cancellation terms in this search.',
    filter: 'Market Only rates',
  },
  ko: {
    tag: '마켓 전용',
    gap: '일반 요금보다 저렴',
    tagTip: 'Dotbiz Market 전용 요금입니다. B2C 사이트와 API·OTA 채널에서는 판매하지 않습니다.',
    gapTip: '이번 검색에서 같은 객실·식사·취소 조건의 일반 요금보다 낮은 요금입니다.',
    filter: '마켓 전용 요금',
  },
  ja: {
    tag: 'マーケット限定',
    gap: '通常料金よりお得',
    tagTip: 'Dotbiz Market 限定料金です。B2C サイトや API・OTA では販売していません。',
    gapTip: '今回の検索で、同じ客室・食事・キャンセル条件の通常料金より安い料金です。',
    filter: 'マーケット限定料金',
  },
  vi: {
    tag: 'Chỉ có trên Market',
    gap: 'Rẻ hơn giá thường',
    tagTip: 'Giá dành riêng cho Dotbiz Market. Không bán trên trang B2C hay kênh API / OTA.',
    gapTip: 'Thấp hơn giá thường cùng loại phòng, bữa ăn và điều kiện hủy trong lần tìm kiếm này.',
    filter: 'Giá chỉ có trên Market',
  },
  zh: {
    tag: '市场专享',
    gap: '比常规价更优惠',
    tagTip: 'Dotbiz Market 专享价格，不在 B2C 网站及 API / OTA 渠道销售。',
    gapTip: '低于本次搜索中相同房型、餐食、取消条件的常规价格。',
    filter: '市场专享价',
  },
  tw: {
    tag: '市場專享',
    gap: '比一般價更優惠',
    tagTip: 'Dotbiz Market 專享價格，不在 B2C 網站及 API / OTA 通路販售。',
    gapTip: '低於本次搜尋中相同房型、餐食、取消條件的一般價格。',
    filter: '市場專享價',
  },
};

export const marketOnlyText = () => TEXT[loadPortalLang()];

export default function MarketOnlyTag({ belowRegular = false }: { belowRegular?: boolean }) {
  const t = marketOnlyText();
  return (
    <>
      <span title={t.tagTip} className="whitespace-nowrap rounded-sm bg-indigo-700 px-1.5 py-0.5 text-[10px] font-bold text-white">
        {t.tag}
      </span>
      {belowRegular && (
        <span
          title={t.gapTip}
          className="whitespace-nowrap rounded-sm border border-emerald-300 bg-emerald-50 px-1.5 py-px text-[10px] font-semibold text-emerald-700"
        >
          {t.gap}
        </span>
      )}
    </>
  );
}
