const puppeteer = require("puppeteer-core");
const path = require("path");

async function main() {
  const browser = await puppeteer.launch({
    executablePath: "/usr/bin/google-chrome",
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    defaultViewport: { width: 700, height: 950, deviceScaleFactor: 2 },
  });

  const page = await browser.newPage();
  const scratchDir = "/home/chris-friday/.gemini/antigravity-ide/brain/663d7a65-bea4-423b-9eec-6eef69f735bc/scratch";

  // 1. Verify Email Preview (Desktop)
  const verifyFile = "file://" + path.join(scratchDir, "verify_email_preview.html");
  await page.setViewport({ width: 700, height: 950, deviceScaleFactor: 2 });
  await page.goto(verifyFile, { waitUntil: "networkidle0" });
  await page.screenshot({ path: path.join(scratchDir, "email_verify_desktop.png") });
  console.log("✓ Captured email_verify_desktop.png");

  // 2. Verify Email Preview (Mobile)
  await page.setViewport({ width: 375, height: 850, deviceScaleFactor: 2, isMobile: true });
  await page.goto(verifyFile, { waitUntil: "networkidle0" });
  await page.screenshot({ path: path.join(scratchDir, "email_verify_mobile.png") });
  console.log("✓ Captured email_verify_mobile.png");

  // 3. Password Reset Preview (Desktop)
  const resetFile = "file://" + path.join(scratchDir, "password_reset_preview.html");
  await page.setViewport({ width: 700, height: 950, deviceScaleFactor: 2 });
  await page.goto(resetFile, { waitUntil: "networkidle0" });
  await page.screenshot({ path: path.join(scratchDir, "email_reset_desktop.png") });
  console.log("✓ Captured email_reset_desktop.png");

  // 4. Password Reset Preview (Mobile)
  await page.setViewport({ width: 375, height: 850, deviceScaleFactor: 2, isMobile: true });
  await page.goto(resetFile, { waitUntil: "networkidle0" });
  await page.screenshot({ path: path.join(scratchDir, "email_reset_mobile.png") });
  console.log("✓ Captured email_reset_mobile.png");

  await browser.close();
  console.log("All email preview screenshots captured successfully!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
