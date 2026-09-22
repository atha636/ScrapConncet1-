async function estimateScrapFromImage({ buffer, mimeType }) {
  if (!process.env.SCRAP_ESTIMATOR_API_KEY) {
    return null;
  }
  // TODO: wire up a real vision-capable AI provider here later.
  return null;
}

module.exports = { estimateScrapFromImage };