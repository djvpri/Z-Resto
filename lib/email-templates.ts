const BASE = `
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #f9fafb;
  padding: 40px 20px;
  margin: 0;
`;

function fmtDate(d: Date) {
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

function layout(content: string) {
  return `<!DOCTYPE html>
<html lang="id">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="${BASE}">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08);">
    <!-- Header -->
    <div style="background:#059669;padding:28px 32px;">
      <div style="font-size:20px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">🍽️ Z-Resto</div>
      <div style="color:#a7f3d0;font-size:12px;margin-top:2px;">Sistem Manajemen Restoran</div>
    </div>
    <!-- Body -->
    <div style="padding:32px;">
      ${content}
    </div>
    <!-- Footer -->
    <div style="padding:20px 32px;border-top:1px solid #f3f4f6;text-align:center;">
      <p style="color:#9ca3af;font-size:12px;margin:0;">
        Email ini dikirim otomatis oleh Z-Resto &mdash; harap jangan dibalas.<br>
        &copy; 2025 Z-Resto. Semua hak dilindungi.
      </p>
    </div>
  </div>
</body>
</html>`;
}

function btn(url: string, label: string) {
  return `<a href="${url}" style="display:inline-block;background:#059669;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:700;font-size:14px;margin-top:24px;">${label}</a>`;
}

function infoRow(label: string, value: string) {
  return `<tr>
    <td style="padding:8px 0;color:#6b7280;font-size:13px;width:40%;">${label}</td>
    <td style="padding:8px 0;color:#111827;font-size:13px;font-weight:600;">${value}</td>
  </tr>`;
}

// ─── TEMPLATES ────────────────────────────────────────────

export function welcomeTemplate({
  ownerName,
  restaurantName,
  trialEndDate,
  appUrl,
}: {
  ownerName: string;
  restaurantName: string;
  trialEndDate: Date;
  appUrl: string;
}) {
  return layout(`
    <h1 style="font-size:22px;font-weight:800;color:#111827;margin:0 0 8px;">Selamat datang, ${ownerName}! 🎉</h1>
    <p style="color:#4b5563;font-size:14px;line-height:1.6;margin:0 0 24px;">
      Akun Z-Resto untuk <strong>${restaurantName}</strong> sudah aktif. Anda mendapatkan masa trial gratis hingga <strong>${fmtDate(trialEndDate)}</strong>.
    </p>
    <table style="width:100%;border-collapse:collapse;background:#f9fafb;border-radius:10px;padding:16px;" cellpadding="0" cellspacing="0">
      <tr><td colspan="2" style="padding:0 0 12px;font-size:12px;font-weight:700;color:#059669;letter-spacing:.5px;text-transform:uppercase;">Detail Akun</td></tr>
      ${infoRow("Nama Restoran", restaurantName)}
      ${infoRow("Email", ownerName)}
      ${infoRow("Masa Trial", `s/d ${fmtDate(trialEndDate)}`)}
    </table>
    <p style="color:#4b5563;font-size:13px;line-height:1.6;margin:24px 0 0;">
      Mulai sekarang Anda bisa mengelola menu, staf, POS kasir, dan laporan penjualan langsung dari dashboard.
    </p>
    ${btn(appUrl + "/pos", "Buka Dashboard →")}
    <p style="color:#9ca3af;font-size:12px;margin-top:24px;">
      Butuh bantuan? Hubungi kami di <a href="mailto:support@zresto.id" style="color:#059669;">support@zresto.id</a>
    </p>
  `);
}

export function subscriptionConfirmedTemplate({
  ownerName,
  restaurantName,
  plan,
  endDate,
  appUrl,
}: {
  ownerName: string;
  restaurantName: string;
  plan: string;
  endDate: Date;
  appUrl: string;
}) {
  return layout(`
    <h1 style="font-size:22px;font-weight:800;color:#111827;margin:0 0 8px;">Pembayaran dikonfirmasi ✅</h1>
    <p style="color:#4b5563;font-size:14px;line-height:1.6;margin:0 0 24px;">
      Halo <strong>${ownerName}</strong>, langganan Z-Resto untuk <strong>${restaurantName}</strong> telah aktif.
    </p>
    <table style="width:100%;border-collapse:collapse;background:#f0fdf4;border-radius:10px;padding:16px;border:1px solid #bbf7d0;" cellpadding="0" cellspacing="0">
      <tr><td colspan="2" style="padding:0 0 12px;font-size:12px;font-weight:700;color:#059669;letter-spacing:.5px;text-transform:uppercase;">Detail Langganan</td></tr>
      ${infoRow("Paket", plan)}
      ${infoRow("Status", "Aktif")}
      ${infoRow("Berlaku hingga", fmtDate(endDate))}
    </table>
    ${btn(appUrl + "/subscription", "Lihat Langganan →")}
  `);
}

export function subscriptionExpiryReminderTemplate({
  ownerName,
  restaurantName,
  daysLeft,
  endDate,
  appUrl,
}: {
  ownerName: string;
  restaurantName: string;
  daysLeft: number;
  endDate: Date;
  appUrl: string;
}) {
  return layout(`
    <h1 style="font-size:22px;font-weight:800;color:#b45309;margin:0 0 8px;">⚠️ Langganan hampir berakhir</h1>
    <p style="color:#4b5563;font-size:14px;line-height:1.6;margin:0 0 24px;">
      Halo <strong>${ownerName}</strong>, langganan Z-Resto untuk <strong>${restaurantName}</strong> akan berakhir dalam <strong>${daysLeft} hari</strong> (${fmtDate(endDate)}).
    </p>
    <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:16px 20px;margin-bottom:8px;">
      <p style="color:#92400e;font-size:13px;margin:0;line-height:1.6;">
        Setelah langganan berakhir, akses dashboard Anda akan dibatasi. Perpanjang sekarang agar tidak terganggu operasional restoran.
      </p>
    </div>
    ${btn(appUrl + "/subscription", "Perpanjang Sekarang →")}
  `);
}

export function subscriptionExpiredTemplate({
  ownerName,
  restaurantName,
  appUrl,
}: {
  ownerName: string;
  restaurantName: string;
  appUrl: string;
}) {
  return layout(`
    <h1 style="font-size:22px;font-weight:800;color:#dc2626;margin:0 0 8px;">Langganan telah berakhir</h1>
    <p style="color:#4b5563;font-size:14px;line-height:1.6;margin:0 0 24px;">
      Halo <strong>${ownerName}</strong>, langganan Z-Resto untuk <strong>${restaurantName}</strong> sudah berakhir. Akses dashboard saat ini dibatasi.
    </p>
    <p style="color:#4b5563;font-size:14px;line-height:1.6;margin:0 0 8px;">
      Perpanjang langganan Anda untuk melanjutkan pengelolaan restoran.
    </p>
    ${btn(appUrl + "/subscription", "Perpanjang Langganan →")}
    <p style="color:#9ca3af;font-size:12px;margin-top:24px;">
      Ada pertanyaan? Hubungi <a href="mailto:support@zresto.id" style="color:#059669;">support@zresto.id</a>
    </p>
  `);
}
