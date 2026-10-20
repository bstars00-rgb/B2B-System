import { loadPortalLang, type PortalLang } from '../utils/portalLang';

/**
 * 마켓 전용요금 태그 — 기획: docs/plan/feature-market-only-rate-tag.md. **프로토타입 · 폐기 가능.**
 * 태그는 "Market Only" 하나. 가격 비교 문구는 넣지 않는다(전용요금이 일반 요금보다 높을 수도 있음 — 2026-10-20 결정).
 * 문구는 포털 언어 설정을 따른다.
 */

const TEXT: Record<PortalLang, { tag: string; tagTip: string; filter: string }> = {
  en: {
    tag: 'Market Only',
    tagTip: 'Dotbiz Market exclusive rate. Not sold on the B2C site or API / OTA channels.',
    filter: 'Market Only rates',
  },
  ko: {
    tag: '마켓 전용',
    tagTip: 'Dotbiz Market 전용 요금입니다. B2C 사이트와 API·OTA 채널에서는 판매하지 않습니다.',
    filter: '마켓 전용 요금',
  },
  ja: {
    tag: 'マーケット限定',
    tagTip: 'Dotbiz Market 限定料金です。B2C サイトや API・OTA では販売していません。',
    filter: 'マーケット限定料金',
  },
  vi: {
    tag: 'Chỉ có trên Market',
    tagTip: 'Giá dành riêng cho Dotbiz Market. Không bán trên trang B2C hay kênh API / OTA.',
    filter: 'Giá chỉ có trên Market',
  },
  zh: {
    tag: '市场专享',
    tagTip: 'Dotbiz Market 专享价格，不在 B2C 网站及 API / OTA 渠道销售。',
    filter: '市场专享价',
  },
  tw: {
    tag: '市場專享',
    tagTip: 'Dotbiz Market 專享價格，不在 B2C 網站及 API / OTA 通路販售。',
    filter: '市場專享價',
  },
};

export const marketOnlyText = () => TEXT[loadPortalLang()];

export default function MarketOnlyTag() {
  const t = marketOnlyText();
  return (
    <span title={t.tagTip} className="whitespace-nowrap rounded-sm bg-indigo-700 px-1.5 py-0.5 text-[10px] font-bold text-white">
      {t.tag}
    </span>
  );
}
