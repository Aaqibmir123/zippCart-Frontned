export type Review = { id: string; productId: string; productName: string; authorName: string;
  rating: number; title: string; comment: string; images: string[]; verifiedPurchase: boolean;
  sellerReply: { comment: string; repliedAt: string } | null; status: 'published' | 'hidden';
  helpfulCount: number; version: number; createdAt: string; updatedAt: string; reported?: boolean; itemIndex?: number };
export type RatingStats = { average: number; count: number; breakdown: Record<string, number> };
export type ReviewPage = { reviews: Review[]; count: number; nextPage: number | null; stats?: RatingStats };
export type ReviewInput = { orderId: string; itemIndex: number; rating: number; title: string; comment: string; images: string[] };
export type ReviewAudit = { _id: string; action: string; reason: string; createdAt: string; before?: { status: string; rating: number }; after?: { status: string; rating: number } };
