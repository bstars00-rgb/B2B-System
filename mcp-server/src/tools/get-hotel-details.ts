import { getHotelDetailsSchema, getHotelDetailsShape } from '../schemas/tools.js';
import { defineTool } from './types.js';

export const getHotelDetailsTool = defineTool({
  name: 'get_hotel_details',
  description:
    '호텔 ID 로 호텔 상세 정보(주소·성급·시설·체크인/아웃 시간·유의사항)를 조회한다. 조회 전용.',
  shape: getHotelDetailsShape,
  schema: getHotelDetailsSchema,
  handler: async (input, ctx) => {
    const hotel = await ctx.gateway.getHotelDetails(input.hotel_id, ctx.traceId);
    return { kind: 'success', data: { hotel } };
  },
});
