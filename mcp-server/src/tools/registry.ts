import type { ToolDefinition } from './types.js';
import { searchDestinationsTool } from './search-destinations.js';
import { searchHotelsTool } from './search-hotels.js';
import { getHotelDetailsTool } from './get-hotel-details.js';
import { searchHotelRatesTool } from './search-hotel-rates.js';
import { compareHotelRatesTool } from './compare-hotel-rates.js';
import { getRateDetailsTool } from './get-rate-details.js';
import { getCancellationPolicyTool } from './get-cancellation-policy.js';
import { getRecentSearchesTool } from './get-recent-searches.js';
import { healthCheckTool } from './health-check.js';

/** 조회 전용 도구 전체. 쓰기/예약 도구는 등록되지 않는다 — 구조적 차단. */
export const allTools: ToolDefinition[] = [
  searchDestinationsTool,
  searchHotelsTool,
  getHotelDetailsTool,
  searchHotelRatesTool,
  compareHotelRatesTool,
  getRateDetailsTool,
  getCancellationPolicyTool,
  getRecentSearchesTool,
  healthCheckTool,
];
