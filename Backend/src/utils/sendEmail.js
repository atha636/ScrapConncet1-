const { resend, hasResendConfig } = require("../config/resend");

const FROM = process.env.RESEND_FROM_EMAIL || "ScrapConnect <onboarding@resend.dev>";
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";

// Minimal inline-styled HTML — email clients strip <style> tags and external
// CSS unreliably, so every style has to be inline to render consistently
// across Gmail, Outlook, etc.
function wrapEmail(title, bodyHtml, ctaText, ctaUrl) {
  return `
    <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #EDE4D3;">
      <div style="background: #A63D24; width: 48px; height: 48px; border-radius: 8px; margin-bottom: 24px;"></div>
      <h1 style="color: #241A12; font-size: 22px; margin: 0 0 16px;">${title}</h1>
      <div style="color: #6B5A47; font-size: 14px; line-height: 1.6; margin-bottom: 28px;">${bodyHtml}</div>
      <a href="${ctaUrl}" style="display: inline-block; background: #A63D24; color: #FAF5EA; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; font-size: 14px;">${ctaText}</a>
      <p style="color: #9C8A73; font-size: 12px; margin-top: 32px;">
        If the button doesn't work, copy this link: <br />
        <span style="word-break: break-all;">${ctaUrl}</span>
      </p>
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