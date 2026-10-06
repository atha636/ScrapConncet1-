// Draws the impact certificate on a canvas and downloads it as a PNG — no
// extra dependency, and nothing is uploaded anywhere. Colours match the
// app's rust/ink palette.

const W = 1600;
const H = 1131; // A4 landscape ratio
const RUST = "#A63D24";
const INK = "#241A12";
const INK_SOFT = "#6B5A47";
const INK_FAINT = "#A09078";
const LINE = "#D8C9AE";
const PAPER = "#FBF6EA";
const SERIF = "Georgia, 'Times New Roman', serif";
const SCRIPT = "'Segoe Script', 'Brush Script MT', 'Snell Roundhand', 'Apple Chancery', cursive";

const loadImage = (src) =>
  new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null); // certificate still works without the logo
    img.src = src;
  });

// Draws a decorative corner flourish; (sx, sy) flip it into each corner.
function corner(ctx, x, y, sx, sy) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(sx, sy);
  ctx.strokeStyle = RUST;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, 70);
  ctx.lineTo(0, 0);
  ctx.lineTo(70, 0);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(14, 14, 6, 0, Math.PI * 2);
  ctx.fillStyle = RUST;
  ctx.fill();
  ctx.restore();
}

// Scalloped round seal with the logo inside.
function seal(ctx, cx, cy, r, logo) {
  ctx.save();
  ctx.fillStyle = RUST;
  const bumps = 32;
  ctx.beginPath();
  for (let i = 0; i <= bumps * 2; i++) {
    const angle = (Math.PI * 2 * i) / (bumps * 2);
    const radius = i % 2 === 0 ? r : r * 0.93;
    const px = cx + Math.cos(angle) * radius;
    const py = cy + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = PAPER;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.8, 0, Math.PI * 2);
  ctx.stroke();

  if (logo) {
    const s = r * 1.0;
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy - r * 0.08, s / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(logo, cx - s / 2, cy - r * 0.08 - s / 2, s, s);
    ctx.restore();
  }

  ctx.fillStyle = PAPER;
  ctx.textAlign = "center";
  ctx.font = `700 ${Math.round(r * 0.17)}px ${SERIF}`;
  ctx.fillText("CERTIFIED", cx, cy + r * 0.62);
  ctx.restore();
}

export async function downloadImpactCertificate({ name, totalKg, co2Kg, treesEquivalent, role }) {
  const logo = await loadImage("/logo-mark.png");

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");

  const center = (text, y, font, color, x = W / 2) => {
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.fillText(text, x, y);
  };

  // Background + faint logo watermark
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, W, H);
  if (logo) {
    ctx.save();
    ctx.globalAlpha = 0.045;
    ctx.drawImage(logo, W / 2 - 280, H / 2 - 280, 560, 560);
    ctx.restore();
  }

  // Double border + corner flourishes
  ctx.strokeStyle = RUST;
  ctx.lineWidth = 10;
  ctx.strokeRect(36, 36, W - 72, H - 72);
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 2;
  ctx.strokeRect(62, 62, W - 124, H - 124);
  corner(ctx, 80, 80, 1, 1);
  corner(ctx, W - 80, 80, -1, 1);
  corner(ctx, 80, H - 80, 1, -1);
  corner(ctx, W - 80, H - 80, -1, -1);

  // Header: logo + brand
  if (logo) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(W / 2, 150, 54, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(logo, W / 2 - 54, 96, 108, 108);
    ctx.restore();
    ctx.strokeStyle = RUST;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(W / 2, 150, 54, 0, Math.PI * 2);
    ctx.stroke();
  }
  center("SCRAPCONNECT", 250, `700 26px ${SERIF}`, RUST);
  center("Certificate of Impact", 335, `700 76px ${SERIF}`, INK);

  // Divider
  ctx.strokeStyle = RUST;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(W / 2 - 160, 365);
  ctx.lineTo(W / 2 + 160, 365);
  ctx.stroke();

  center("This certifies that", 425, `400 28px ${SERIF}`, INK_SOFT);

  // Name, shrunk to fit if it's long
  const displayName = name || "A ScrapConnect member";
  let nameSize = 72;
  ctx.font = `700 ${nameSize}px ${SERIF}`;
  while (ctx.measureText(displayName).width > W - 400 && nameSize > 32) {
    nameSize -= 4;
    ctx.font = `700 ${nameSize}px ${SERIF}`;
  }
  center(displayName, 510, `700 ${nameSize}px ${SERIF}`, RUST);
  const nameWidth = Math.min(ctx.measureText(displayName).width + 80, W - 300);
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(W / 2 - nameWidth / 2, 535);
  ctx.lineTo(W / 2 + nameWidth / 2, 535);
  ctx.stroke();

  const verb = role === "collector" ? "has collected and recycled" : "has sent for recycling";
  center(verb, 590, `400 28px ${SERIF}`, INK_SOFT);

  // Three headline stats
  const stats = [
    { value: `${totalKg} kg`, label: "of scrap recycled" },
    { value: `${co2Kg} kg`, label: "CO\u2082 saved (estimated)" },
    { value: `${treesEquivalent}`, label: treesEquivalent === 1 ? "tree absorbing for a year" : "trees absorbing for a year" },
  ];
  const colW = 380;
  stats.forEach((s, i) => {
    const x = W / 2 + (i - 1) * colW;
    center(s.value, 700, `700 62px ${SERIF}`, INK, x);
    center(s.label, 740, `italic 24px ${SERIF}`, INK_SOFT, x);
    if (i > 0) {
      ctx.strokeStyle = LINE;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - colW / 2, 655);
      ctx.lineTo(x - colW / 2, 750);
      ctx.stroke();
    }
  });

  // Signature block (left)
  const sigX = 400;
  const sigY = 905;
  center("Atharv", sigY - 12, `400 64px ${SCRIPT}`, INK, sigX);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(sigX - 190, sigY + 6);
  ctx.lineTo(sigX + 190, sigY + 6);
  ctx.stroke();
  center("Atharv", sigY + 40, `700 24px ${SERIF}`, INK, sigX);
  center("Founder, ScrapConnect", sigY + 70, `400 20px ${SERIF}`, INK_SOFT, sigX);

  // Seal (center) and issue details (right)
  seal(ctx, W / 2, sigY - 10, 92, logo);

  const now = new Date();
  const date = now.toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
  const serial = `SC-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${Math.random()
    .toString(36)
    .slice(2, 7)
    .toUpperCase()}`;
  const rightX = W - 400;
  center(date, sigY - 12, `400 30px ${SERIF}`, INK, rightX);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(rightX - 190, sigY + 6);
  ctx.lineTo(rightX + 190, sigY + 6);
  ctx.stroke();
  center("Date of issue", sigY + 40, `700 24px ${SERIF}`, INK, rightX);
  center(`Certificate no. ${serial}`, sigY + 70, `400 20px ${SERIF}`, INK_SOFT, rightX);

  center(
    "CO\u2082 figures are estimates based on average recycling savings per material.",
    H - 100,
    `italic 18px ${SERIF}`,
    INK_FAINT
  );

  const link = document.createElement("a");
  link.download = "scrapconnect-impact-certificate.png";
  link.href = canvas.toDataURL("image/png");
  link.click();
}