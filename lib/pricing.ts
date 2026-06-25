export const PRICING = {
  TRIAL: {
    days: 14,
    amount: 0,
    label: "Trial Gratis",
  },
  MONTHLY: {
    days: 30,
    amount: 100000,
    label: "Bulanan",
    perMonth: 100000,
  },
  YEARLY: {
    days: 365,
    amount: 1000000,
    label: "Tahunan",
    perMonth: 83334, // ~Rp 83rb/bulan
    savePercent: 17,
  },
} as const;

export const BANK_INFO = {
  bank: "BCA",
  accountNumber: "123-456-7890",
  accountName: "Z Resto Indonesia",
  bankLogo: "🏦",
};

export function generatePaymentCode(baseAmount: number): number {
  const suffix = Math.floor(Math.random() * 900) + 100;
  return Math.floor(baseAmount / 1000) * 1000 + suffix;
}

export function getSubscriptionEndDate(plan: "TRIAL" | "MONTHLY" | "YEARLY", from = new Date()): Date {
  const d = new Date(from);
  d.setDate(d.getDate() + PRICING[plan].days);
  return d;
}

export function daysUntil(date: Date | string): number {
  const diff = new Date(date).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export type PlanKey = "MONTHLY" | "YEARLY";
