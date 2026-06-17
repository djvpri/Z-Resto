import { Resend } from "resend";
import {
  welcomeTemplate,
  subscriptionConfirmedTemplate,
  subscriptionExpiryReminderTemplate,
  subscriptionExpiredTemplate,
} from "./email-templates";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM = process.env.EMAIL_FROM || "Z-Resto <noreply@zresto.id>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://zresto.id";

async function send(to: string, subject: string, html: string) {
  if (!resend) {
    console.log(`[Email skipped — RESEND_API_KEY not set] To: ${to} | Subject: ${subject}`);
    return;
  }
  try {
    await resend.emails.send({ from: FROM, to, subject, html });
  } catch (err) {
    // Email failure should never crash the app
    console.error("[Email error]", err);
  }
}

export async function sendWelcomeEmail({
  to,
  ownerName,
  restaurantName,
  trialEndDate,
}: {
  to: string;
  ownerName: string;
  restaurantName: string;
  trialEndDate: Date;
}) {
  await send(
    to,
    `Selamat datang di Z-Resto, ${ownerName}!`,
    welcomeTemplate({ ownerName, restaurantName, trialEndDate, appUrl: APP_URL })
  );
}

export async function sendSubscriptionConfirmedEmail({
  to,
  ownerName,
  restaurantName,
  plan,
  endDate,
}: {
  to: string;
  ownerName: string;
  restaurantName: string;
  plan: string;
  endDate: Date;
}) {
  const planLabel = plan === "TRIAL" ? "Trial" : plan === "MONTHLY" ? "Bulanan" : "Tahunan";
  await send(
    to,
    `Langganan ${planLabel} Z-Resto Anda telah aktif`,
    subscriptionConfirmedTemplate({ ownerName, restaurantName, plan: planLabel, endDate, appUrl: APP_URL })
  );
}

export async function sendExpiryReminderEmail({
  to,
  ownerName,
  restaurantName,
  daysLeft,
  endDate,
}: {
  to: string;
  ownerName: string;
  restaurantName: string;
  daysLeft: number;
  endDate: Date;
}) {
  await send(
    to,
    `Langganan Z-Resto Anda berakhir dalam ${daysLeft} hari`,
    subscriptionExpiryReminderTemplate({ ownerName, restaurantName, daysLeft, endDate, appUrl: APP_URL })
  );
}

export async function sendExpiredEmail({
  to,
  ownerName,
  restaurantName,
}: {
  to: string;
  ownerName: string;
  restaurantName: string;
}) {
  await send(
    to,
    "Langganan Z-Resto Anda telah berakhir",
    subscriptionExpiredTemplate({ ownerName, restaurantName, appUrl: APP_URL })
  );
}
