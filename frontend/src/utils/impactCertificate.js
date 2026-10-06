// Draws the impact certificate on a canvas and downloads it as a PNG — no
// extra dependency, and nothing is uploaded anywhere. Colours match the
// app's rust/ink palette.
export function downloadImpactCertificate({ name, totalKg, co2Kg, treesEquivalent, role }) {
  const W = 1200;
  const H = 800;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#FBF6EA";
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = "#A63D24";
  ctx.lineWidth = 8;
  ctx.strokeRect(30, 30, W - 60, H - 60);
  ctx.strokeStyle = "#D8C9AE";
  ctx.lineWidth = 2;
  ctx.strokeRect(48, 48, W - 96, H - 96);

  const center = (text, y, font, color) => {
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.fillText(text, W / 2, y);
  };

  center("ScrapConnect", 130, "700 28px Georgia, serif", "#A63D24");
  center("Certificate of Impact", 210, "700 56px Georgia, serif", "#241A12");
  center("This certifies that", 275, "400 24px Georgia, serif", "#6B5A47");
  center(name || "A ScrapConnect member", 350, "700 48px Georgia, serif", "#A63D24");

  const verb = role === "collector" ? "collected and recycled" : "sent for recycling";
  center(`has ${verb}`, 410, "400 24px Georgia, serif", "#6B5A47");

  center(`${totalKg} kg of scrap`, 485, "700 54px Georgia, serif", "#241A12");
  center(`saving an estimated ${co2Kg} kg of CO\u2082`, 545, "400 28px Georgia, serif", "#241A12");
  if (treesEquivalent > 0) {
    center(
      `about what ${treesEquivalent} tree${treesEquivalent === 1 ? "" : "s"} absorb in a year`,
      590,
      "italic 22px Georgia, serif",
      "#6B5A47"
    );
  }

  const date = new Date().toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
  center(`Issued ${date}`, 690, "400 20px Georgia, serif", "#6B5A47");
  center("CO\u2082 figures are estimates based on average recycling savings.", 725, "italic 16px Georgia, serif", "#A09078");

  const link = document.createElement("a");
  link.download = "scrapconnect-impact-certificate.png";
  link.href = canvas.toDataURL("image/png");
  link.click();
}