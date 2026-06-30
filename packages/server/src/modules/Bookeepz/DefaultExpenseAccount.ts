type BookeepzBusinessLike = {
  name: string;
  organizationId: string;
};

export function getDefaultExpenseAccountName(business: BookeepzBusinessLike) {
  return `${business.name}_main_01`;
}

export function getDefaultExpenseAccountSlug(business: BookeepzBusinessLike) {
  return `${business.organizationId}-main-01`;
}

export function getDefaultPaymentAccountName(business: BookeepzBusinessLike) {
  return `${business.name}_payment_01`;
}

export function getDefaultPaymentAccountSlug(business: BookeepzBusinessLike) {
  return `${business.organizationId}-payment-01`;
}
