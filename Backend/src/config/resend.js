const { Resend } = require("resend");

const hasResendConfig = !!process.env.RESEND_API_KEY;

const resend = hasResendConfig ? new Resend(process.env.RESEND_API_KEY) : null;

module.exports = { resend, hasResendConfig };