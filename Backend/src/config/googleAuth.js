const { OAuth2Client } = require("google-auth-library");

const hasGoogleConfig = Boolean(process.env.GOOGLE_CLIENT_ID);

const googleClient = hasGoogleConfig ? new OAuth2Client(process.env.GOOGLE_CLIENT_ID) : null;

module.exports = { googleClient, hasGoogleConfig };