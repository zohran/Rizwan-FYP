/**
 * Billing logic: totalAmount = durationInMinutes × ratePerMinute
 */
export function calculateBilling(
  durationInMinutes: number,
  ratePerMinute: number
): number {
  return durationInMinutes * ratePerMinute;
}
