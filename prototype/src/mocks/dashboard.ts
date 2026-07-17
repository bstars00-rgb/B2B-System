/**
 * 대시보드(통계) 목데이터 — 닷비즈 고도화 신규 기능.
 *
 * 원본 명세(Dashboard_Specification_2026-07-17_KR.md)의 구조·수치를 그대로 이식하되,
 * 우리 클론과 맞지 않는 3가지를 조정했다.
 *   1) 통화 JPY — 클론 셀러(ATTIC TOURS)도 hotelDb 요금도 전부 엔화다. 원본 USD를 ×150 환산.
 *   2) 기간을 오늘 기준으로 산출 — 원본은 2026-03에 고정돼 "This Month"가 과거를 가리켰다.
 *   3) 난수 제거 — Math.random()은 새로고침마다 그래프가 바뀌어 데모·QA에서 재현이 안 된다.
 *
 * 합계(연간 집계 등)는 반드시 월별 배열에서 파생시킨다. 손으로 적으면 어긋난다.
 */

/** 시드 PRNG(mulberry32) — 같은 시드면 항상 같은 그래프 */
export function seeded(seed: number): () => number {
  let t = seed;
  return () => {
    t = (t + 0x6d2b79f5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/** 원본이 USD로 적어둔 금액의 엔화 환산율 */
export const JPY = 150;

export const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const TODAY = new Date();
TODAY.setHours(0, 0, 0, 0);

export const THIS_YEAR = TODAY.getFullYear();
export const THIS_MONTH = TODAY.getMonth();

/** n개월 전(0 = 이번 달)의 라벨. toISOString은 JST에서 하루 밀리므로 로컬 포맷만 쓴다. */
function monthsBack(n: number): { y: number; m: number } {
  const d = new Date(THIS_YEAR, THIS_MONTH - n, 1);
  return { y: d.getFullYear(), m: d.getMonth() };
}

/** "Jul-26" — 연도 경계 가시성(동일 월명 혼동 방지) */
export function monthLabelShort(n: number): string {
  const { y, m } = monthsBack(n);
  return `${MONTH_ABBR[m]}-${String(y).slice(2)}`;
}

/** "Jul 2026" */
export function monthLabelLong(n: number): string {
  const { y, m } = monthsBack(n);
  return `${MONTH_ABBR[m]} ${y}`;
}

/** n일 전의 YYYY-MM-DD (로컬 기준) */
export function isoDaysBack(n: number): string {
  const d = new Date(TODAY);
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const kpi = {
  totalBookings: 156,
  bookingsChange: '+12%',
  revenue: 48750 * JPY,
  revenueChange: '+8.5%',
  roomNights: 423,
  nightsChange: '+15%',
  /** revenue / totalBookings 와 어긋나지 않도록 파생 */
  avgBookingValue: Math.round((48750 * JPY) / 156),
  avgChange: '-3.2%',
};

/** OP 포인트 — 금액이 아니라 포인트라 환산하지 않는다 */
export const points = {
  balance: 24500,
  earned: 8400,
  used: 3200,
};

/* Per-country bestselling hotels — 20 hotels each, 16 countries */
const _hotelsByCountry: Record<string, { hotelName: string; starRating: number; city: string; supplier: string }[]> = {
  Japan: [
    { hotelName: "Keio Plaza Hotel Tokyo", starRating: 5, city: "Tokyo", supplier: "Direct" },
    { hotelName: "Hotel Metropolitan Tokyo Ikebukuro", starRating: 3.5, city: "Tokyo", supplier: "DIDA" },
    { hotelName: "Hotel Sunroute Plaza Shinjuku", starRating: 3.5, city: "Tokyo", supplier: "Direct" },
    { hotelName: "Shinjuku Washington Hotel Main", starRating: 4, city: "Tokyo", supplier: "Direct" },
    { hotelName: "Shibuya Tokyu REI Hotel", starRating: 3, city: "Tokyo", supplier: "DIDA" },
    { hotelName: "Hotel Gracery Ginza", starRating: 4, city: "Tokyo", supplier: "Direct" },
    { hotelName: "Shinjuku Washington Hotel Annex", starRating: 4, city: "Tokyo", supplier: "DIDA" },
    { hotelName: "Hotel Gracery Shinjuku", starRating: 4, city: "Tokyo", supplier: "Direct" },
    { hotelName: "Mitsui Garden Hotel Shiodome Italia-gai Tokyo", starRating: 4, city: "Tokyo", supplier: "Hotelbeds" },
    { hotelName: "Tokyo Bay Ariake Washington Hotel", starRating: 4, city: "Tokyo", supplier: "Direct" },
    { hotelName: "Akihabara Washington Hotel", starRating: 3.5, city: "Tokyo", supplier: "DIDA" },
    { hotelName: "ANA Crowne Plaza Osaka", starRating: 4, city: "Osaka", supplier: "Direct" },
    { hotelName: "Hilton Osaka", starRating: 5, city: "Osaka", supplier: "Hotelbeds" },
    { hotelName: "Hotel Granvia Kyoto", starRating: 4, city: "Kyoto", supplier: "DIDA" },
    { hotelName: "Rihga Royal Hotel Osaka", starRating: 4.5, city: "Osaka", supplier: "Hotelbeds" },
    { hotelName: "Hotel Nikko Fukuoka", starRating: 4, city: "Fukuoka", supplier: "Direct" },
    { hotelName: "Sheraton Grand Hiroshima Hotel", starRating: 5, city: "Hiroshima", supplier: "Hotelbeds" },
    { hotelName: "JR Tower Hotel Nikko Sapporo", starRating: 4.5, city: "Sapporo", supplier: "DIDA" },
    { hotelName: "Miyako Hotel Hakata", starRating: 3.5, city: "Fukuoka", supplier: "DIDA" },
    { hotelName: "Namba Oriental Hotel", starRating: 4, city: "Osaka", supplier: "Direct" },
  ],
  "South Korea": [
    { hotelName: "Grand Hyatt Seoul", starRating: 5, city: "Seoul", supplier: "Direct" },
    { hotelName: "Lotte Hotel Seoul", starRating: 5, city: "Seoul", supplier: "Direct" },
    { hotelName: "Shilla Stay Mapo", starRating: 4, city: "Seoul", supplier: "Direct" },
    { hotelName: "JW Marriott Dongdaemun Square Seoul", starRating: 5, city: "Seoul", supplier: "Hotelbeds" },
    { hotelName: "Signiel Seoul", starRating: 5, city: "Seoul", supplier: "Direct" },
    { hotelName: "Conrad Seoul", starRating: 5, city: "Seoul", supplier: "Hotelbeds" },
    { hotelName: "Novotel Ambassador Seoul Gangnam", starRating: 4, city: "Seoul", supplier: "DIDA" },
    { hotelName: "Four Seasons Hotel Seoul", starRating: 5, city: "Seoul", supplier: "Hotelbeds" },
    { hotelName: "Lotte Hotel Busan", starRating: 5, city: "Busan", supplier: "Direct" },
    { hotelName: "Park Hyatt Busan", starRating: 5, city: "Busan", supplier: "Hotelbeds" },
    { hotelName: "Haeundae Grand Hotel", starRating: 4, city: "Busan", supplier: "DIDA" },
    { hotelName: "Shilla Stay Jeju", starRating: 4, city: "Jeju", supplier: "Direct" },
    { hotelName: "Hyatt Regency Jeju", starRating: 5, city: "Jeju", supplier: "Hotelbeds" },
    { hotelName: "Ramada Plaza Jeju Ocean Front", starRating: 4, city: "Jeju", supplier: "DIDA" },
    { hotelName: "InterContinental Seoul COEX", starRating: 5, city: "Seoul", supplier: "Hotelbeds" },
    { hotelName: "L7 Hongdae by Lotte", starRating: 4, city: "Seoul", supplier: "Direct" },
    { hotelName: "Glad Mapo", starRating: 3.5, city: "Seoul", supplier: "DIDA" },
    { hotelName: "Courtyard by Marriott Seoul Namdaemun", starRating: 4, city: "Seoul", supplier: "Hotelbeds" },
    { hotelName: "Nine Tree Premier Hotel Myeongdong II", starRating: 3.5, city: "Seoul", supplier: "DIDA" },
    { hotelName: "Stanford Hotel Seoul", starRating: 4, city: "Seoul", supplier: "Direct" },
  ],
  Thailand: [
    { hotelName: "Hotel Nikko Bangkok", starRating: 4.5, city: "Bangkok", supplier: "DIDA" },
    { hotelName: "The Peninsula Bangkok", starRating: 5, city: "Bangkok", supplier: "DIDA" },
    { hotelName: "Centara Grand at CentralWorld", starRating: 5, city: "Bangkok", supplier: "DIDA" },
    { hotelName: "Mandarin Oriental Bangkok", starRating: 5, city: "Bangkok", supplier: "Hotelbeds" },
    { hotelName: "Shangri-La Bangkok", starRating: 5, city: "Bangkok", supplier: "Hotelbeds" },
    { hotelName: "Anantara Siam Bangkok Hotel", starRating: 5, city: "Bangkok", supplier: "DIDA" },
    { hotelName: "Conrad Bangkok", starRating: 5, city: "Bangkok", supplier: "Hotelbeds" },
    { hotelName: "Novotel Bangkok Sukhumvit 20", starRating: 4, city: "Bangkok", supplier: "DIDA" },
    { hotelName: "Sheraton Grande Sukhumvit", starRating: 5, city: "Bangkok", supplier: "Hotelbeds" },
    { hotelName: "Grande Centre Point Ratchadamri", starRating: 4.5, city: "Bangkok", supplier: "Direct" },
    { hotelName: "Hua Hin Marriott Resort & Spa", starRating: 5, city: "Hua Hin", supplier: "Hotelbeds" },
    { hotelName: "Le Meridien Chiang Mai", starRating: 5, city: "Chiang Mai", supplier: "DIDA" },
    { hotelName: "Anantara Chiang Mai Resort", starRating: 5, city: "Chiang Mai", supplier: "Hotelbeds" },
    { hotelName: "Hilton Pattaya", starRating: 5, city: "Pattaya", supplier: "Hotelbeds" },
    { hotelName: "Amari Phuket", starRating: 4.5, city: "Phuket", supplier: "DIDA" },
    { hotelName: "Banyan Tree Phuket", starRating: 5, city: "Phuket", supplier: "Hotelbeds" },
    { hotelName: "Novotel Phuket Kamala Beach", starRating: 4, city: "Phuket", supplier: "DIDA" },
    { hotelName: "Kata Rocks", starRating: 5, city: "Phuket", supplier: "Hotelbeds" },
    { hotelName: "Centara Karon Resort Phuket", starRating: 4, city: "Phuket", supplier: "DIDA" },
    { hotelName: "Dusit Thani Hua Hin", starRating: 5, city: "Hua Hin", supplier: "Direct" },
  ],
  "Hong Kong": [
    { hotelName: "The Ritz-Carlton Hong Kong", starRating: 5, city: "Hong Kong", supplier: "Hotelbeds" },
    { hotelName: "Mandarin Oriental Hong Kong", starRating: 5, city: "Hong Kong", supplier: "Hotelbeds" },
    { hotelName: "The Peninsula Hong Kong", starRating: 5, city: "Hong Kong", supplier: "DIDA" },
    { hotelName: "Four Seasons Hotel Hong Kong", starRating: 5, city: "Hong Kong", supplier: "Hotelbeds" },
    { hotelName: "W Hong Kong", starRating: 5, city: "Hong Kong", supplier: "DIDA" },
    { hotelName: "Rosewood Hong Kong", starRating: 5, city: "Hong Kong", supplier: "Hotelbeds" },
    { hotelName: "The Upper House", starRating: 5, city: "Hong Kong", supplier: "DIDA" },
    { hotelName: "Kerry Hotel Hong Kong", starRating: 5, city: "Hong Kong", supplier: "Hotelbeds" },
    { hotelName: "InterContinental Grand Stanford Hong Kong", starRating: 5, city: "Hong Kong", supplier: "DIDA" },
    { hotelName: "Shangri-La Hotel Hong Kong", starRating: 5, city: "Hong Kong", supplier: "Hotelbeds" },
    { hotelName: "Conrad Hong Kong", starRating: 5, city: "Hong Kong", supplier: "DIDA" },
    { hotelName: "Hyatt Regency Hong Kong Tsim Sha Tsui", starRating: 5, city: "Hong Kong", supplier: "Hotelbeds" },
    { hotelName: "JW Marriott Hotel Hong Kong", starRating: 5, city: "Hong Kong", supplier: "Hotelbeds" },
    { hotelName: "The Langham Hong Kong", starRating: 5, city: "Hong Kong", supplier: "DIDA" },
    { hotelName: "Island Shangri-La Hong Kong", starRating: 5, city: "Hong Kong", supplier: "Hotelbeds" },
    { hotelName: "Cordis Hong Kong", starRating: 5, city: "Hong Kong", supplier: "DIDA" },
    { hotelName: "Grand Hyatt Hong Kong", starRating: 5, city: "Hong Kong", supplier: "Hotelbeds" },
    { hotelName: "Harbour Grand Hong Kong", starRating: 4, city: "Hong Kong", supplier: "DIDA" },
    { hotelName: "Novotel Century Hong Kong", starRating: 4, city: "Hong Kong", supplier: "DIDA" },
    { hotelName: "Hotel ICON Hong Kong", starRating: 5, city: "Hong Kong", supplier: "Hotelbeds" },
  ],
  Taiwan: [
    { hotelName: "Mandarin Oriental Taipei", starRating: 5, city: "Taipei", supplier: "Hotelbeds" },
    { hotelName: "The Grand Hotel Taipei", starRating: 5, city: "Taipei", supplier: "DIDA" },
    { hotelName: "W Taipei", starRating: 5, city: "Taipei", supplier: "Hotelbeds" },
    { hotelName: "Shangri-La's Far Eastern Plaza Hotel Taipei", starRating: 5, city: "Taipei", supplier: "DIDA" },
    { hotelName: "Regent Taipei", starRating: 5, city: "Taipei", supplier: "Hotelbeds" },
    { hotelName: "Grand Hyatt Taipei", starRating: 5, city: "Taipei", supplier: "Hotelbeds" },
    { hotelName: "The Okura Prestige Taipei", starRating: 5, city: "Taipei", supplier: "DIDA" },
    { hotelName: "Eslite Hotel Taipei", starRating: 5, city: "Taipei", supplier: "DIDA" },
    { hotelName: "Palais de Chine Hotel Taipei", starRating: 5, city: "Taipei", supplier: "Hotelbeds" },
    { hotelName: "Humble House Taipei", starRating: 5, city: "Taipei", supplier: "DIDA" },
    { hotelName: "Silks Place Tainan", starRating: 5, city: "Tainan", supplier: "DIDA" },
    { hotelName: "Fleur de Chine Hotel Sun Moon Lake", starRating: 5, city: "Nantou", supplier: "Hotelbeds" },
    { hotelName: "Lakeshore Hotel Hualien", starRating: 4, city: "Hualien", supplier: "DIDA" },
    { hotelName: "Evergreen Laurel Hotel Taichung", starRating: 4.5, city: "Taichung", supplier: "Hotelbeds" },
    { hotelName: "Hotel Royal Chihpen", starRating: 4, city: "Taitung", supplier: "DIDA" },
    { hotelName: "Sheraton Grand Taipei Hotel", starRating: 5, city: "Taipei", supplier: "Hotelbeds" },
    { hotelName: "Caesar Park Hotel Taipei", starRating: 4, city: "Taipei", supplier: "DIDA" },
    { hotelName: "Howard Plaza Hotel Kaohsiung", starRating: 4.5, city: "Kaohsiung", supplier: "Hotelbeds" },
    { hotelName: "Tayih Landis Hotel Tainan", starRating: 4, city: "Tainan", supplier: "DIDA" },
    { hotelName: "Novotel Taipei Taoyuan International Airport", starRating: 4, city: "Taoyuan", supplier: "Hotelbeds" },
  ],
  China: [
    { hotelName: "Shangri-La Hotel Shanghai", starRating: 5, city: "Shanghai", supplier: "DIDA" },
    { hotelName: "The Peninsula Shanghai", starRating: 5, city: "Shanghai", supplier: "Hotelbeds" },
    { hotelName: "Park Hyatt Shanghai", starRating: 5, city: "Shanghai", supplier: "Hotelbeds" },
    { hotelName: "Waldorf Astoria Shanghai on the Bund", starRating: 5, city: "Shanghai", supplier: "DIDA" },
    { hotelName: "China World Hotel Beijing", starRating: 5, city: "Beijing", supplier: "DIDA" },
    { hotelName: "The Opposite House Beijing", starRating: 5, city: "Beijing", supplier: "Hotelbeds" },
    { hotelName: "Rosewood Beijing", starRating: 5, city: "Beijing", supplier: "Hotelbeds" },
    { hotelName: "Wynn Palace Macau", starRating: 5, city: "Macau", supplier: "DIDA" },
    { hotelName: "The Venetian Macao", starRating: 5, city: "Macau", supplier: "Hotelbeds" },
    { hotelName: "Grand Hyatt Shenzhen", starRating: 5, city: "Shenzhen", supplier: "DIDA" },
    { hotelName: "Hilton Guangzhou Tianhe", starRating: 5, city: "Guangzhou", supplier: "Hotelbeds" },
    { hotelName: "InterContinental Chengdu Global Center", starRating: 5, city: "Chengdu", supplier: "DIDA" },
    { hotelName: "St. Regis Sanya Yalong Bay", starRating: 5, city: "Sanya", supplier: "Hotelbeds" },
    { hotelName: "Shangri-La Hangzhou", starRating: 5, city: "Hangzhou", supplier: "DIDA" },
    { hotelName: "JW Marriott Hotel Xi'an", starRating: 5, city: "Xi'an", supplier: "Hotelbeds" },
    { hotelName: "The Ritz-Carlton Chengdu", starRating: 5, city: "Chengdu", supplier: "Hotelbeds" },
    { hotelName: "Four Seasons Hotel Hangzhou", starRating: 5, city: "Hangzhou", supplier: "DIDA" },
    { hotelName: "Mandarin Oriental Pudong Shanghai", starRating: 5, city: "Shanghai", supplier: "Hotelbeds" },
    { hotelName: "Sofitel Wanda Beijing", starRating: 5, city: "Beijing", supplier: "DIDA" },
    { hotelName: "Hyatt Regency Dalian", starRating: 5, city: "Dalian", supplier: "Hotelbeds" },
  ],
  "United Arab Emirates": [
    { hotelName: "Marriott Marquis Dubai", starRating: 5, city: "Dubai", supplier: "Hotelbeds" },
    { hotelName: "Burj Al Arab Jumeirah", starRating: 5, city: "Dubai", supplier: "Hotelbeds" },
    { hotelName: "Atlantis The Palm", starRating: 5, city: "Dubai", supplier: "DIDA" },
    { hotelName: "Armani Hotel Dubai", starRating: 5, city: "Dubai", supplier: "Hotelbeds" },
    { hotelName: "Jumeirah Beach Hotel", starRating: 5, city: "Dubai", supplier: "DIDA" },
    { hotelName: "The Address Downtown", starRating: 5, city: "Dubai", supplier: "Hotelbeds" },
    { hotelName: "Waldorf Astoria Dubai Palm Jumeirah", starRating: 5, city: "Dubai", supplier: "DIDA" },
    { hotelName: "One&Only The Palm", starRating: 5, city: "Dubai", supplier: "Hotelbeds" },
    { hotelName: "Raffles Dubai", starRating: 5, city: "Dubai", supplier: "DIDA" },
    { hotelName: "Ritz-Carlton Dubai", starRating: 5, city: "Dubai", supplier: "Hotelbeds" },
    { hotelName: "Four Seasons Resort Dubai at Jumeirah Beach", starRating: 5, city: "Dubai", supplier: "Hotelbeds" },
    { hotelName: "Sofitel Dubai The Obelisk", starRating: 5, city: "Dubai", supplier: "DIDA" },
    { hotelName: "Shangri-La Hotel Dubai", starRating: 5, city: "Dubai", supplier: "DIDA" },
    { hotelName: "Emirates Palace Abu Dhabi", starRating: 5, city: "Abu Dhabi", supplier: "Hotelbeds" },
    { hotelName: "St. Regis Abu Dhabi", starRating: 5, city: "Abu Dhabi", supplier: "Hotelbeds" },
    { hotelName: "Louvre Abu Dhabi by Saadiyat", starRating: 5, city: "Abu Dhabi", supplier: "DIDA" },
    { hotelName: "Rixos Premium Dubai JBR", starRating: 5, city: "Dubai", supplier: "Hotelbeds" },
    { hotelName: "Hilton Dubai Creek", starRating: 5, city: "Dubai", supplier: "DIDA" },
    { hotelName: "Novotel Dubai Al Barsha", starRating: 4, city: "Dubai", supplier: "DIDA" },
    { hotelName: "Hyatt Regency Dubai", starRating: 5, city: "Dubai", supplier: "Hotelbeds" },
  ],
  "United Kingdom": [
    { hotelName: "Hilton London Bankside", starRating: 4, city: "London", supplier: "Hotelbeds" },
    { hotelName: "The Savoy", starRating: 5, city: "London", supplier: "Hotelbeds" },
    { hotelName: "Claridge's", starRating: 5, city: "London", supplier: "Hotelbeds" },
    { hotelName: "The Langham London", starRating: 5, city: "London", supplier: "DIDA" },
    { hotelName: "Shangri-La The Shard London", starRating: 5, city: "London", supplier: "Hotelbeds" },
    { hotelName: "The Dorchester", starRating: 5, city: "London", supplier: "Hotelbeds" },
    { hotelName: "InterContinental London Park Lane", starRating: 5, city: "London", supplier: "DIDA" },
    { hotelName: "Novotel London West", starRating: 4, city: "London", supplier: "DIDA" },
    { hotelName: "Park Plaza Westminster Bridge", starRating: 4, city: "London", supplier: "Hotelbeds" },
    { hotelName: "Corinthia London", starRating: 5, city: "London", supplier: "Hotelbeds" },
    { hotelName: "Kimpton Fitzroy London", starRating: 5, city: "London", supplier: "DIDA" },
    { hotelName: "Hyatt Regency London", starRating: 4, city: "London", supplier: "Hotelbeds" },
    { hotelName: "The Grand Brighton", starRating: 4, city: "Brighton", supplier: "DIDA" },
    { hotelName: "Malmaison Manchester", starRating: 4, city: "Manchester", supplier: "Hotelbeds" },
    { hotelName: "Hotel du Vin Edinburgh", starRating: 4, city: "Edinburgh", supplier: "DIDA" },
    { hotelName: "The Balmoral Edinburgh", starRating: 5, city: "Edinburgh", supplier: "Hotelbeds" },
    { hotelName: "Radisson Blu Hotel Edinburgh", starRating: 4, city: "Edinburgh", supplier: "DIDA" },
    { hotelName: "Hilton Liverpool City Centre", starRating: 4, city: "Liverpool", supplier: "Hotelbeds" },
    { hotelName: "IHG Hotel Birmingham", starRating: 4, city: "Birmingham", supplier: "DIDA" },
    { hotelName: "DoubleTree by Hilton Oxford", starRating: 4, city: "Oxford", supplier: "Hotelbeds" },
  ],
  France: [
    { hotelName: "Mandarin Oriental Paris", starRating: 5, city: "Paris", supplier: "Hotelbeds" },
    { hotelName: "Le Meurice", starRating: 5, city: "Paris", supplier: "Hotelbeds" },
    { hotelName: "Four Seasons Hotel George V Paris", starRating: 5, city: "Paris", supplier: "Hotelbeds" },
    { hotelName: "Shangri-La Hotel Paris", starRating: 5, city: "Paris", supplier: "DIDA" },
    { hotelName: "The Peninsula Paris", starRating: 5, city: "Paris", supplier: "Hotelbeds" },
    { hotelName: "Pullman Paris Tour Eiffel", starRating: 4, city: "Paris", supplier: "DIDA" },
    { hotelName: "Novotel Paris Centre Tour Eiffel", starRating: 4, city: "Paris", supplier: "DIDA" },
    { hotelName: "Hyatt Regency Paris Etoile", starRating: 4, city: "Paris", supplier: "Hotelbeds" },
    { hotelName: "Hilton Paris Opera", starRating: 4, city: "Paris", supplier: "Hotelbeds" },
    { hotelName: "Mercure Paris Centre Tour Eiffel", starRating: 4, city: "Paris", supplier: "DIDA" },
    { hotelName: "InterContinental Marseille", starRating: 5, city: "Marseille", supplier: "Hotelbeds" },
    { hotelName: "Sofitel Lyon Bellecour", starRating: 5, city: "Lyon", supplier: "DIDA" },
    { hotelName: "Hotel Negresco Nice", starRating: 5, city: "Nice", supplier: "Hotelbeds" },
    { hotelName: "InterContinental Carlton Cannes", starRating: 5, city: "Cannes", supplier: "Hotelbeds" },
    { hotelName: "Le Royal Nice", starRating: 4, city: "Nice", supplier: "DIDA" },
    { hotelName: "Radisson Blu Hotel Bordeaux", starRating: 4, city: "Bordeaux", supplier: "Hotelbeds" },
    { hotelName: "Hilton Strasbourg", starRating: 4, city: "Strasbourg", supplier: "DIDA" },
    { hotelName: "Marriott Lyon Cite Internationale", starRating: 4, city: "Lyon", supplier: "Hotelbeds" },
    { hotelName: "Novotel Toulouse Centre Compans", starRating: 4, city: "Toulouse", supplier: "DIDA" },
    { hotelName: "Best Western Plus Hotel de Dieppe Rouen", starRating: 3, city: "Rouen", supplier: "DIDA" },
  ],
  Singapore: [
    { hotelName: "Marina Bay Sands", starRating: 5, city: "Singapore", supplier: "DIDA" },
    { hotelName: "Raffles Hotel Singapore", starRating: 5, city: "Singapore", supplier: "Hotelbeds" },
    { hotelName: "The Fullerton Hotel", starRating: 5, city: "Singapore", supplier: "DIDA" },
    { hotelName: "Mandarin Oriental Singapore", starRating: 5, city: "Singapore", supplier: "Hotelbeds" },
    { hotelName: "Shangri-La Singapore", starRating: 5, city: "Singapore", supplier: "DIDA" },
    { hotelName: "The Ritz-Carlton Millenia Singapore", starRating: 5, city: "Singapore", supplier: "Hotelbeds" },
    { hotelName: "Four Seasons Hotel Singapore", starRating: 5, city: "Singapore", supplier: "Hotelbeds" },
    { hotelName: "JW Marriott Hotel Singapore South Beach", starRating: 5, city: "Singapore", supplier: "DIDA" },
    { hotelName: "Conrad Centennial Singapore", starRating: 5, city: "Singapore", supplier: "Hotelbeds" },
    { hotelName: "Pan Pacific Singapore", starRating: 5, city: "Singapore", supplier: "DIDA" },
    { hotelName: "InterContinental Singapore Robertson Quay", starRating: 5, city: "Singapore", supplier: "Hotelbeds" },
    { hotelName: "Swissotel The Stamford", starRating: 5, city: "Singapore", supplier: "DIDA" },
    { hotelName: "Hilton Singapore Orchard", starRating: 5, city: "Singapore", supplier: "Hotelbeds" },
    { hotelName: "Novotel Singapore on Stevens", starRating: 4, city: "Singapore", supplier: "DIDA" },
    { hotelName: "Parkroyal Collection Marina Bay", starRating: 5, city: "Singapore", supplier: "Hotelbeds" },
    { hotelName: "Capella Singapore", starRating: 5, city: "Singapore", supplier: "Hotelbeds" },
    { hotelName: "Sofitel Singapore Sentosa", starRating: 5, city: "Singapore", supplier: "DIDA" },
    { hotelName: "Oasia Hotel Downtown", starRating: 4, city: "Singapore", supplier: "DIDA" },
    { hotelName: "Hotel Jen Tanglin Singapore", starRating: 4, city: "Singapore", supplier: "Hotelbeds" },
    { hotelName: "Goodwood Park Hotel", starRating: 5, city: "Singapore", supplier: "Direct" },
  ],
  "United States": [
    { hotelName: "Waldorf Astoria New York", starRating: 5, city: "New York", supplier: "Hotelbeds" },
    { hotelName: "The Plaza New York", starRating: 5, city: "New York", supplier: "Hotelbeds" },
    { hotelName: "The St. Regis New York", starRating: 5, city: "New York", supplier: "Hotelbeds" },
    { hotelName: "Four Seasons Hotel New York Downtown", starRating: 5, city: "New York", supplier: "Hotelbeds" },
    { hotelName: "Mandarin Oriental New York", starRating: 5, city: "New York", supplier: "DIDA" },
    { hotelName: "The Beverly Hills Hotel", starRating: 5, city: "Los Angeles", supplier: "Hotelbeds" },
    { hotelName: "Montage Beverly Hills", starRating: 5, city: "Los Angeles", supplier: "Hotelbeds" },
    { hotelName: "The Ritz-Carlton San Francisco", starRating: 5, city: "San Francisco", supplier: "DIDA" },
    { hotelName: "Four Seasons Hotel Chicago", starRating: 5, city: "Chicago", supplier: "Hotelbeds" },
    { hotelName: "Wynn Las Vegas", starRating: 5, city: "Las Vegas", supplier: "DIDA" },
    { hotelName: "Bellagio Las Vegas", starRating: 5, city: "Las Vegas", supplier: "Hotelbeds" },
    { hotelName: "The Setai Miami Beach", starRating: 5, city: "Miami", supplier: "DIDA" },
    { hotelName: "Faena Hotel Miami Beach", starRating: 5, city: "Miami", supplier: "Hotelbeds" },
    { hotelName: "Four Seasons Resort Maui", starRating: 5, city: "Maui", supplier: "Hotelbeds" },
    { hotelName: "Ritz-Carlton Washington DC", starRating: 5, city: "Washington DC", supplier: "DIDA" },
    { hotelName: "The Langham Boston", starRating: 5, city: "Boston", supplier: "Hotelbeds" },
    { hotelName: "Rosewood Mansion on Turtle Creek", starRating: 5, city: "Dallas", supplier: "DIDA" },
    { hotelName: "The Nines Portland", starRating: 5, city: "Portland", supplier: "Hotelbeds" },
    { hotelName: "Thompson Seattle", starRating: 4, city: "Seattle", supplier: "DIDA" },
    { hotelName: "Four Seasons Hotel Austin", starRating: 5, city: "Austin", supplier: "Hotelbeds" },
  ],
  Vietnam: [
    { hotelName: "Sofitel Legend Metropole Hanoi", starRating: 5, city: "Hanoi", supplier: "DIDA" },
    { hotelName: "Rex Hotel Saigon", starRating: 5, city: "Ho Chi Minh", supplier: "Direct" },
    { hotelName: "Park Hyatt Saigon", starRating: 5, city: "Ho Chi Minh", supplier: "Hotelbeds" },
    { hotelName: "InterContinental Danang Sun Peninsula", starRating: 5, city: "Da Nang", supplier: "Hotelbeds" },
    { hotelName: "JW Marriott Phu Quoc Emerald Bay", starRating: 5, city: "Phu Quoc", supplier: "DIDA" },
    { hotelName: "The Reverie Saigon", starRating: 5, city: "Ho Chi Minh", supplier: "Hotelbeds" },
    { hotelName: "Lotte Hotel Hanoi", starRating: 5, city: "Hanoi", supplier: "Direct" },
    { hotelName: "Melia Hanoi", starRating: 5, city: "Hanoi", supplier: "DIDA" },
    { hotelName: "Sheraton Saigon Hotel & Towers", starRating: 5, city: "Ho Chi Minh", supplier: "Hotelbeds" },
    { hotelName: "Fusion Maia Da Nang", starRating: 5, city: "Da Nang", supplier: "DIDA" },
    { hotelName: "Four Seasons The Nam Hai Hoi An", starRating: 5, city: "Hoi An", supplier: "Hotelbeds" },
    { hotelName: "Anantara Hoi An Resort", starRating: 4.5, city: "Hoi An", supplier: "DIDA" },
    { hotelName: "Vinpearl Resort Nha Trang", starRating: 5, city: "Nha Trang", supplier: "DIDA" },
    { hotelName: "Six Senses Ninh Van Bay", starRating: 5, city: "Nha Trang", supplier: "Hotelbeds" },
    { hotelName: "Caravelle Saigon", starRating: 5, city: "Ho Chi Minh", supplier: "DIDA" },
    { hotelName: "Hilton Hanoi Opera", starRating: 5, city: "Hanoi", supplier: "Hotelbeds" },
    { hotelName: "Novotel Danang Premier Han River", starRating: 4, city: "Da Nang", supplier: "DIDA" },
    { hotelName: "Pullman Vung Tau", starRating: 5, city: "Vung Tau", supplier: "Hotelbeds" },
    { hotelName: "Muong Thanh Luxury Nha Trang", starRating: 5, city: "Nha Trang", supplier: "Direct" },
    { hotelName: "Hotel Nikko Saigon", starRating: 4, city: "Ho Chi Minh", supplier: "Direct" },
  ],
  Australia: [
    { hotelName: "Shangri-La Sydney", starRating: 5, city: "Sydney", supplier: "Hotelbeds" },
    { hotelName: "Park Hyatt Sydney", starRating: 5, city: "Sydney", supplier: "Hotelbeds" },
    { hotelName: "Four Seasons Hotel Sydney", starRating: 5, city: "Sydney", supplier: "DIDA" },
    { hotelName: "The Langham Sydney", starRating: 5, city: "Sydney", supplier: "Hotelbeds" },
    { hotelName: "Crown Towers Melbourne", starRating: 5, city: "Melbourne", supplier: "Hotelbeds" },
    { hotelName: "The Westin Melbourne", starRating: 5, city: "Melbourne", supplier: "DIDA" },
    { hotelName: "Sofitel Melbourne on Collins", starRating: 5, city: "Melbourne", supplier: "Hotelbeds" },
    { hotelName: "InterContinental Sydney Double Bay", starRating: 5, city: "Sydney", supplier: "DIDA" },
    { hotelName: "Hilton Brisbane", starRating: 5, city: "Brisbane", supplier: "Hotelbeds" },
    { hotelName: "Novotel Sydney Darling Harbour", starRating: 4, city: "Sydney", supplier: "DIDA" },
    { hotelName: "Marriott Resort & Spa Gold Coast", starRating: 5, city: "Gold Coast", supplier: "Hotelbeds" },
    { hotelName: "COMO The Treasury Perth", starRating: 5, city: "Perth", supplier: "Hotelbeds" },
    { hotelName: "The Tasman Hobart", starRating: 5, city: "Hobart", supplier: "DIDA" },
    { hotelName: "Pier One Sydney Harbour", starRating: 4, city: "Sydney", supplier: "Hotelbeds" },
    { hotelName: "QT Melbourne", starRating: 5, city: "Melbourne", supplier: "DIDA" },
    { hotelName: "Hyatt Regency Perth", starRating: 5, city: "Perth", supplier: "Hotelbeds" },
    { hotelName: "Sheraton Grand Mirage Resort Gold Coast", starRating: 5, city: "Gold Coast", supplier: "DIDA" },
    { hotelName: "Pullman Cairns International", starRating: 5, city: "Cairns", supplier: "Hotelbeds" },
    { hotelName: "Ovolo Wooloomooloo", starRating: 5, city: "Sydney", supplier: "DIDA" },
    { hotelName: "Crown Metropol Melbourne", starRating: 5, city: "Melbourne", supplier: "Hotelbeds" },
  ],
  Germany: [
    { hotelName: "Hotel Adlon Kempinski Berlin", starRating: 5, city: "Berlin", supplier: "Hotelbeds" },
    { hotelName: "The Ritz-Carlton Berlin", starRating: 5, city: "Berlin", supplier: "Hotelbeds" },
    { hotelName: "Mandarin Oriental Munich", starRating: 5, city: "Munich", supplier: "DIDA" },
    { hotelName: "Bayerischer Hof Munich", starRating: 5, city: "Munich", supplier: "Hotelbeds" },
    { hotelName: "Hotel Vier Jahreszeiten Kempinski Munich", starRating: 5, city: "Munich", supplier: "Hotelbeds" },
    { hotelName: "Fairmont Hotel Vier Jahreszeiten Hamburg", starRating: 5, city: "Hamburg", supplier: "DIDA" },
    { hotelName: "Steigenberger Frankfurter Hof", starRating: 5, city: "Frankfurt", supplier: "Hotelbeds" },
    { hotelName: "Sofitel Munich Bayerpost", starRating: 5, city: "Munich", supplier: "DIDA" },
    { hotelName: "Breidenbacher Hof Dusseldorf", starRating: 5, city: "Dusseldorf", supplier: "Hotelbeds" },
    { hotelName: "Hotel Taschenbergpalais Kempinski Dresden", starRating: 5, city: "Dresden", supplier: "DIDA" },
    { hotelName: "Hyatt Regency Cologne", starRating: 4, city: "Cologne", supplier: "Hotelbeds" },
    { hotelName: "Hilton Berlin", starRating: 4, city: "Berlin", supplier: "DIDA" },
    { hotelName: "Le Meridien Stuttgart", starRating: 4, city: "Stuttgart", supplier: "Hotelbeds" },
    { hotelName: "InterContinental Berlin", starRating: 5, city: "Berlin", supplier: "Hotelbeds" },
    { hotelName: "Novotel Munich City Arnulfpark", starRating: 4, city: "Munich", supplier: "DIDA" },
    { hotelName: "Marriott Hotel Hamburg", starRating: 4, city: "Hamburg", supplier: "Hotelbeds" },
    { hotelName: "Radisson Blu Hotel Frankfurt", starRating: 4, city: "Frankfurt", supplier: "DIDA" },
    { hotelName: "NH Collection Dresden Altmarkt", starRating: 4, city: "Dresden", supplier: "Hotelbeds" },
    { hotelName: "Pullman Munich", starRating: 4, city: "Munich", supplier: "DIDA" },
    { hotelName: "Motel One Berlin-Alexanderplatz", starRating: 3, city: "Berlin", supplier: "DIDA" },
  ],
  Indonesia: [
    { hotelName: "Four Seasons Resort Bali at Sayan", starRating: 5, city: "Bali", supplier: "Hotelbeds" },
    { hotelName: "The Mulia Bali", starRating: 5, city: "Bali", supplier: "Hotelbeds" },
    { hotelName: "Ayana Resort Bali", starRating: 5, city: "Bali", supplier: "DIDA" },
    { hotelName: "Mandarin Oriental Jakarta", starRating: 5, city: "Jakarta", supplier: "Hotelbeds" },
    { hotelName: "The Ritz-Carlton Bali", starRating: 5, city: "Bali", supplier: "Hotelbeds" },
    { hotelName: "Bulgari Resort Bali", starRating: 5, city: "Bali", supplier: "Hotelbeds" },
    { hotelName: "Alila Villas Uluwatu", starRating: 5, city: "Bali", supplier: "DIDA" },
    { hotelName: "W Bali Seminyak", starRating: 5, city: "Bali", supplier: "DIDA" },
    { hotelName: "InterContinental Bali Resort", starRating: 5, city: "Bali", supplier: "Hotelbeds" },
    { hotelName: "Grand Hyatt Jakarta", starRating: 5, city: "Jakarta", supplier: "DIDA" },
    { hotelName: "Sheraton Grand Jakarta Gandaria City", starRating: 5, city: "Jakarta", supplier: "Hotelbeds" },
    { hotelName: "Raffles Jakarta", starRating: 5, city: "Jakarta", supplier: "Hotelbeds" },
    { hotelName: "The Trans Luxury Hotel Bandung", starRating: 5, city: "Bandung", supplier: "DIDA" },
    { hotelName: "Hilton Bandung", starRating: 5, city: "Bandung", supplier: "Hotelbeds" },
    { hotelName: "Amanjiwo Borobudur", starRating: 5, city: "Yogyakarta", supplier: "Hotelbeds" },
    { hotelName: "Sheraton Surabaya Hotel & Towers", starRating: 5, city: "Surabaya", supplier: "DIDA" },
    { hotelName: "Novotel Bali Benoa", starRating: 4, city: "Bali", supplier: "DIDA" },
    { hotelName: "Hotel Tentrem Yogyakarta", starRating: 5, city: "Yogyakarta", supplier: "Direct" },
    { hotelName: "Westin Resort Nusa Dua Bali", starRating: 5, city: "Bali", supplier: "Hotelbeds" },
    { hotelName: "Padma Resort Legian", starRating: 4.5, city: "Bali", supplier: "DIDA" },
  ],
  Canada: [
    { hotelName: "Park Hyatt Toronto", starRating: 5, city: "Toronto", supplier: "Hotelbeds" },
    { hotelName: "Fairmont Royal York Toronto", starRating: 5, city: "Toronto", supplier: "Hotelbeds" },
    { hotelName: "Four Seasons Hotel Toronto", starRating: 5, city: "Toronto", supplier: "DIDA" },
    { hotelName: "Shangri-La Hotel Toronto", starRating: 5, city: "Toronto", supplier: "Hotelbeds" },
    { hotelName: "Fairmont Pacific Rim Vancouver", starRating: 5, city: "Vancouver", supplier: "Hotelbeds" },
    { hotelName: "Rosewood Hotel Georgia Vancouver", starRating: 5, city: "Vancouver", supplier: "DIDA" },
    { hotelName: "Four Seasons Hotel Montreal", starRating: 5, city: "Montreal", supplier: "Hotelbeds" },
    { hotelName: "Fairmont Le Chateau Frontenac", starRating: 5, city: "Quebec City", supplier: "Hotelbeds" },
    { hotelName: "Ritz-Carlton Montreal", starRating: 5, city: "Montreal", supplier: "DIDA" },
    { hotelName: "JW Marriott Parq Vancouver", starRating: 5, city: "Vancouver", supplier: "Hotelbeds" },
    { hotelName: "Fairmont Banff Springs", starRating: 5, city: "Banff", supplier: "Hotelbeds" },
    { hotelName: "Fairmont Chateau Lake Louise", starRating: 5, city: "Lake Louise", supplier: "DIDA" },
    { hotelName: "Fairmont Chateau Whistler", starRating: 5, city: "Whistler", supplier: "Hotelbeds" },
    { hotelName: "The Rimrock Resort Hotel Banff", starRating: 4.5, city: "Banff", supplier: "DIDA" },
    { hotelName: "Delta Hotels by Marriott Toronto", starRating: 4, city: "Toronto", supplier: "Hotelbeds" },
    { hotelName: "Hilton Toronto", starRating: 4, city: "Toronto", supplier: "DIDA" },
    { hotelName: "Hyatt Regency Calgary", starRating: 4, city: "Calgary", supplier: "Hotelbeds" },
    { hotelName: "Ottawa Marriott Hotel", starRating: 4, city: "Ottawa", supplier: "DIDA" },
    { hotelName: "Inn at Laurel Point Victoria", starRating: 4, city: "Victoria", supplier: "Hotelbeds" },
    { hotelName: "Loden Hotel Vancouver", starRating: 5, city: "Vancouver", supplier: "DIDA" },
  ],
};

/* Build flat ranked array — global ranking by aggregate score */
export const bestsellingHotels = (() => {
  const all: { rank: number; hotelName: string; starRating: number; city: string; country: string; supplier: string }[] = [];
  const entries = Object.entries(_hotelsByCountry);
  /* Round-robin pick from each country to create a global ranking */
  for (let i = 0; i < 20; i++) {
    for (const [country, hotels] of entries) {
      if (i < hotels.length) {
        all.push({ rank: 0, hotelName: hotels[i].hotelName, starRating: hotels[i].starRating, city: hotels[i].city, country, supplier: hotels[i].supplier });
      }
    }
  }
  all.forEach((h, idx) => { h.rank = idx + 1; });
  return all;
})();

/* Per-country lookup for filtered view */
export const bestsellingByCountry = _hotelsByCountry;

/**
 * 12개월 TTV 추이 — 라벨은 "Jul-26" 형식(연도 경계 가시성, 동일 월명 혼동 방지).
 * 원본의 계절성 형태는 유지하되 마지막 달을 이번 달 매출(kpi.revenue)과 일치시킨다.
 * (원본은 TTV와 KPI 매출의 자릿수가 서로 어긋나 있었다.)
 */
const TTV_SHAPE = [3200, 3800, 4100, 5200, 4800, 3900, 4300, 3600, 4700, 3100, 3500, 4550];
export const ttvTrend = TTV_SHAPE.map((v, i) => ({
  month: monthLabelShort(TTV_SHAPE.length - 1 - i),
  amount: Math.round((v / TTV_SHAPE[TTV_SHAPE.length - 1]) * kpi.revenue),
}));

/**
 * Destination Booking Percentage — 국가별/도시별.
 * 각 배열의 bookings·nights·amount 합계는 kpi(156건 / 423박 / 매출)와 정확히 맞아떨어진다.
 */
export const destinationStats = {
  country: [
    { name: 'South Korea', bookings: 63, amount: 18900 * JPY, nights: 168, color: '#EF7F29' },
    { name: 'Japan', bookings: 33, amount: 12540 * JPY, nights: 92, color: '#FF8C00' },
    { name: 'Thailand', bookings: 28, amount: 6720 * JPY, nights: 78, color: '#0369A1' },
    { name: 'Vietnam', bookings: 15, amount: 3600 * JPY, nights: 42, color: '#009505' },
    { name: 'Singapore', bookings: 10, amount: 4800 * JPY, nights: 28, color: '#7C3AED' },
    { name: 'Others', bookings: 7, amount: 2190 * JPY, nights: 15, color: '#94A3B8' },
  ],
  city: [
    { name: 'Seoul', bookings: 45, amount: 13500 * JPY, nights: 120, color: '#EF7F29' },
    { name: 'Bangkok', bookings: 22, amount: 5280 * JPY, nights: 62, color: '#0369A1' },
    { name: 'Tokyo', bookings: 18, amount: 7200 * JPY, nights: 50, color: '#FF8C00' },
    { name: 'Osaka', bookings: 15, amount: 5340 * JPY, nights: 42, color: '#7C3AED' },
    { name: 'Busan', bookings: 12, amount: 3600 * JPY, nights: 34, color: '#009505' },
    { name: 'Ho Chi Minh', bookings: 10, amount: 2400 * JPY, nights: 28, color: '#F59E0B' },
    { name: 'Singapore', bookings: 10, amount: 4800 * JPY, nights: 28, color: '#EC4899' },
    { name: 'Hanoi', bookings: 5, amount: 1200 * JPY, nights: 14, color: '#6366F1' },
    { name: 'Others', bookings: 19, amount: 5430 * JPY, nights: 45, color: '#94A3B8' },
  ],
};

/**
 * Daily Booking Statistics — 오늘로 끝나는 31일.
 * Data Center의 Daily 탭도 이 배열을 함께 쓴다(원본은 nights가 빠진 별도 배열이었다).
 */
export const dailyBookingStats = (() => {
  const rnd = seeded(20260717);
  const data: { date: string; bookingCount: number; bookingAmount: number; nights: number }[] = [];
  for (let i = 30; i >= 0; i--) {
    const date = isoDaysBack(i);
    const dow = new Date(`${date}T00:00:00`).getDay();
    const isWeekend = dow === 0 || dow === 6;
    const bookingCount = Math.round((isWeekend ? 3 : 5) + rnd() * 6);
    const bookingAmount = Math.round(bookingCount * (250 + rnd() * 150) * JPY);
    const nights = Math.round(bookingCount * (1.5 + rnd() * 2));
    data.push({ date, bookingCount, bookingAmount, nights });
  }
  return data;
})();
