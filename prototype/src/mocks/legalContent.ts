/**
 * 약관·개인정보처리방침 콘텐츠 — 로그인 밖(대문)에서도 열람 가능.
 * 초안(시안 기반) — 법무 검토 후 본문 확정 예정 (기획서 ② §4.5).
 */

export interface LegalSection {
  /** 번호 배지 (01, 02…) — 없으면 소제목 카드형 */
  no?: string;
  title: string;
  /** 문단 (줄바꿈 \n 지원) */
  body?: string;
  /** 불릿 목록 — [굵은 용어, 설명] */
  bullets?: Array<[string, string]>;
  /** 라벨:값 표 (회사 정보 등) */
  table?: Array<[string, string]>;
}

export interface LegalDoc {
  id: 'agreement' | 'privacy';
  title: string;
  company: string;
  sections: LegalSection[];
  footnote: string;
}

export const LEGAL_DOCS: Record<'agreement' | 'privacy', LegalDoc> = {
  agreement: {
    id: 'agreement',
    title: 'DOTBIZ Platform Service Agreement',
    company: 'OHMYHOTEL GLOBAL PTE. LTD.',
    sections: [
      {
        no: '01',
        title: 'Purpose',
        body:
          'This Agreement sets forth the terms and conditions for the use of the DOTBIZ B2B Hotel Booking Platform ("Service") provided by OHMYHOTEL GLOBAL PTE. LTD. ("Company") and the rights, obligations, and responsibilities between the Company and Members.',
      },
      {
        no: '02',
        title: 'Definitions',
        bullets: [
          ['"Service"', 'refers to the DOTBIZ B2B hotel booking platform and all related services.'],
          ['"Member"', 'refers to a travel agency or operating partner who has agreed to this Agreement and registered an account.'],
          ['"Net Rate"', 'refers to the wholesale hotel rate provided by the Company, upon which Members may set their own margin.'],
          ['"Operating Partner (OP)"', "refers to a Member's sub-account for booking operations."],
        ],
      },
      {
        no: '03',
        title: 'Service Provision',
        body:
          'The Company provides hotel search and booking services, settlement and payment processing, voucher generation, AI-powered recommendations, and related B2B travel services. The Company may modify, suspend, or discontinue the Service with prior notice, except in cases of force majeure.',
      },
    ],
    footnote: '※ 초안 — 이후 조항(결제·취소·책임 등)은 법무 검토와 함께 추후 보강 예정입니다.',
  },
  privacy: {
    id: 'privacy',
    title: 'Privacy Policy',
    company: 'OHMYHOTEL GLOBAL PTE. LTD.',
    sections: [
      {
        title: 'Company Information',
        table: [
          ['Company', 'OHMYHOTEL GLOBAL PTE. LTD.'],
          ['Representative', 'LEE MISOON'],
          ['Reg. Number', '202543984E'],
          ['Address', '111 Somerset Road, #06-01H, 111 Somerset, Singapore 238164'],
        ],
      },
      {
        title: 'Entrustment of Personal Information Processing',
        body:
          'The Company entrusts the processing of personal information and the operation of the customer center to the following Korean corporation.',
        table: [
          ['Company', 'OHMYHOTEL & CO., LTD.'],
          ['Representative', 'Lee Misoon'],
          ['Reg. Number', '105-87-71311'],
          ['Address', 'GT Dongdaemun Bldg 6F, 328 Jongno, Jongno-gu, Seoul, Korea'],
          ['Tel', '+82-2-762-0552 (Weekdays 09:00~18:00 KST)'],
          ['PI Manager', 'Lee Misoon'],
          ['Mail-order Reg.', '2020-Seoul Jongno-0399'],
        ],
      },
    ],
    footnote: '※ 초안 — 수집 항목·보유 기간·제3자 제공 등 세부 조항은 추후 보강 예정입니다.',
  },
};
