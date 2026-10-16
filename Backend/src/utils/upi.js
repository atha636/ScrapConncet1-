// Builds a standard UPI payment link (the one GPay, PhonePe, Paytm and BHIM
// all open). It only pre-fills the payer's UPI app — the app itself cannot
// see whether the payment went through, so the flow around it is
// "collector says paid" + "requester confirms received".
const UPI_ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]{1,255}@[a-zA-Z][a-zA-Z0-9]{1,63}$/;

function buildUpiUri({ upiId, name, amount, note }) {
  const params = [
    `pa=${encodeURIComponent(upiId).replace("%40", "@")}`,
    `pn=${encodeURIComponent(String(name || "").slice(0, 40))}`,
    `am=${Number(amount).toFixed(2)}`,
    "cu=INR",
    `tn=${encodeURIComponent(String(note || "").slice(0, 60))}`,
  ];
  return `upi://pay?${params.join("&")}`;
}

module.exports = { UPI_ID_PATTERN, buildUpiUri };