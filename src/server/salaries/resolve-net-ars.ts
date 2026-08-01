import { indicatorAtOrBefore } from "@/server/inflation";

export type SalaryCurrency = "ARS" | "USD";

/** Persist always in ARS; convert USD using blue sell for the payment month. */
export async function resolveNetArs(
  currency: SalaryCurrency,
  amount: number,
  paymentMonth: string,
): Promise<{ netArs: number; usdBlueSell: number }> {
  const indicator = await indicatorAtOrBefore(paymentMonth);
  if (currency === "ARS") {
    return { netArs: amount, usdBlueSell: indicator.usdBlueSell };
  }
  if (indicator.usdBlueSell <= 0) {
    throw new Error("no_blue_rate");
  }
  return {
    netArs: Math.round(amount * indicator.usdBlueSell),
    usdBlueSell: indicator.usdBlueSell,
  };
}
