import nodemailer from "nodemailer";
import {
  welcomeTemplate,
  subscriptionConfirmedTemplate,
  subscriptionExpiryReminderTemplate,
  subscriptionExpiredTemplate,
} from "./email-templates";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://zresto.id";
const FROM = process.env.EMAIL_FROM || "Z-Resto <noreply@gmail.com>";

function makeTransport() {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  if (!user || !pass) return null;

  return nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
}

async function send(to: string, subject: string, html: string) {
  const transport = makeTransport();
  if (!transport) {
    console.log(`[Email skipped — EMAIL_USER/EMAIL_PASS tidak diset] To: ${to} | ${subject}`);
    return;
  }
  try {
    await transport.sendMail({ from: FROM, to, subject, html });
  } catch (err) {
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
