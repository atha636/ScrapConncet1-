const { resend, hasResendConfig } = require("../config/resend");

const FROM = process.env.RESEND_FROM_EMAIL || "ScrapConnect <onboarding@resend.dev>";
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";

// ScrapConnect brand palette — kept in sync with frontend/tailwind.config.js
const COLORS = {
  bg: "#EDE4D3",
  surface: "#FFFCF5",
  ink: "#241A12",
  inkSoft: "#6B5A47",
  inkFaint: "#9C8A73",
  rust: "#A63D24",
  rustDark: "#7E2E1A",
  amber: "#C4841E",
  line: "#D8C9AE",
};

// Minimal inline-styled HTML — email clients strip <style> tags and external
// CSS unreliably, so every style has to be inline to render consistently
// across Gmail, Outlook, etc.
function wrapEmail(title, bodyHtml, ctaText, ctaUrl) {
  const year = new Date().getFullYear();
  return `
  <div style="background: ${COLORS.bg}; padding: 40px 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;">
    <div style="max-width: 480px; margin: 0 auto;">

      <!-- Wordmark -->
      <table role="presentation" style="margin-bottom: 24px;">
        <tr>
          <td style="background: ${COLORS.rust}; width: 36px; height: 36px; border-radius: 8px; text-align: center; vertical-align: middle;">
            <span style="color: ${COLORS.surface}; font-weight: 700; font-size: 16px; font-family: Georgia, serif;">S</span>
          </td>
          <td style="padding-left: 10px; vertical-align: middle;">
            <span style="color: ${COLORS.ink}; font-weight: 700; font-size: 17px; letter-spacing: -0.2px;">ScrapConnect</span>
          </td>
        </tr>
      </table>

      <!-- Card -->
      <div style="background: ${COLORS.surface}; border: 1px solid ${COLORS.line}; border-radius: 10px; padding: 36px 32px; box-shadow: 0 1px 3px rgba(36,26,18,0.06);">
        <h1 style="color: ${COLORS.ink}; font-size: 21px; font-weight: 700; margin: 0 0 14px; line-height: 1.3;">${title}</h1>
        <div style="color: ${COLORS.inkSoft}; font-size: 14.5px; line-height: 1.65; margin-bottom: 30px;">${bodyHtml}</div>

        <table role="presentation">
          <tr>
            <td style="border-radius: 7px; background: ${COLORS.rust};">
              <a href="${ctaUrl}" style="display: inline-block; color: ${COLORS.surface}; text-decoration: none; padding: 12px 26px; font-weight: 600; font-size: 14px; border-radius: 7px;">${ctaText}</a>
            </td>
          </tr>
        </table>

        <div style="border-top: 1px solid ${COLORS.line}; margin-top: 30px; padding-top: 18px;">
          <p style="color: ${COLORS.inkFaint}; font-size: 12px; line-height: 1.6; margin: 0;">
            If the button doesn't work, copy and paste this link into your browser:<br />
            <a href="${ctaUrl}" style="color: ${COLORS.amber}; word-break: break-all; text-decoration: none;">${ctaUrl}</a>
          </p>
        </div>
      </div>

      <!-- Footer -->
      <p style="color: ${COLORS.inkFaint}; font-size: 12px; text-align: center; margin: 24px 0 0;">
        &copy; ${year} ScrapConnect &middot; You're receiving this because an action was requested on your account.
      </p>
    </div>
  </div>
  `;
}

/**
 * Sends an email via Resend. Best-effort: if RESEND_API_KEY isn't
 * configured, this logs and returns quietly instead of throwing — the same
 * "optional integration" pattern used for Cloudinary and web-push, so the
 * app never breaks just because an email provider isn't set up yet.
 */
async function sendEmail({ to, subject, html }) {
  if (!hasResendConfig) {
    console.warn(`Resend not configured — skipped email "${subject}" to ${to}`);
    return;
  }

  try {
    await resend.emails.send({ from: FROM, to, subject, html });
  } catch (err) {
    console.error("Email send failed:", err.message);
  }
}

async function sendVerificationEmail(user, token) {
  const url = `${CLIENT_ORIGIN}/verify-email?token=${token}`;
  await sendEmail({
    to: user.email,
    subject: "Verify your ScrapConnect email",
    html: wrapEmail(
      "Verify your email",
      `Hi ${user.name}, confirm this is your email address to finish setting up your ScrapConnect account. This link expires in 24 hours.`,
      "Verify email",
      url
    ),
  });
}

async function sendPasswordResetEmail(user, token) {
  const url = `${CLIENT_ORIGIN}/reset-password?token=${token}`;
  await sendEmail({
    to: user.email,
    subject: "Reset your ScrapConnect password",
    html: wrapEmail(
      "Reset your password",
      `Hi ${user.name}, we got a request to reset your password. This link expires in 1 hour. If you didn't request this, you can safely ignore this email.`,
      "Reset password",
      url
    ),
  });
}

module.exports = { sendEmail, sendVerificationEmail, sendPasswordResetEmail };