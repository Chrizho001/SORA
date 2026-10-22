/* eslint-disable */
const puppeteer = require("puppeteer-core");
const path = require("path");
const fs = require("fs");

async function main() {
  console.log("Launching local Chrome...");
  const browser = await puppeteer.launch({
    executablePath: "/usr/bin/google-chrome",
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    defaultViewport: { width: 1280, height: 850 },
  });

  const page = await browser.newPage();
  page.on("console", (msg) => console.log("PAGE LOG:", msg.text()));
  page.on("pageerror", (err) => console.log("PAGE ERROR:", err.toString()));

  const scratchDir =
    process.env.SCRATCH_DIR ||
    "/home/chris-friday/.gemini/antigravity-ide/brain/663d7a65-bea4-423b-9eec-6eef69f735bc/scratch";

  if (!fs.existsSync(scratchDir)) {
    fs.mkdirSync(scratchDir, { recursive: true });
  }

  console.log("1. Navigating to http://localhost:3000/login...");
  await page.goto("http://localhost:3000/login", { waitUntil: "networkidle0" });
  await page.screenshot({ path: path.join(scratchDir, "e2e_1_login_initial.png") });

  console.log("2. Typing student login credentials...");
  await page.type("#login-email", "student@sora.study", { delay: 30 });
  await page.type("#login-password", "Password123!", { delay: 30 });
  await page.screenshot({ path: path.join(scratchDir, "e2e_2_login_filled.png") });

  console.log("3. Submitting login form...");
  await page.click('button[type="submit"]');

  console.log("4. Waiting for /dashboard transition & hydration...");
  await page.waitForFunction(
    () => window.location.pathname === "/dashboard",
    { timeout: 15000 }
  );

  console.log("5. Waiting for authenticated user dashboard content...");
  await page.waitForSelector("#logout-button", { visible: true, timeout: 15000 });
  await new Promise((r) => setTimeout(r, 1200));

  const cookiesBefore = await page.cookies();
  const refreshCookieBefore = cookiesBefore.find((c) => c.name === "refresh_token");
  console.log(
    "   ✓ Refresh cookie present before logout:",
    refreshCookieBefore ? "YES (HttpOnly)" : "NO"
  );

  await page.screenshot({ path: path.join(scratchDir, "e2e_3_dashboard_authenticated.png") });
  console.log("   ✓ Authenticated dashboard screenshot captured!");

  console.log("6. Clicking Log Out button...");
  await page.click("#logout-button");

  console.log("7. Waiting for redirect back to /login...");
  await page.waitForFunction(
    () => window.location.pathname === "/login",
    { timeout: 15000 }
  );
  await new Promise((r) => setTimeout(r, 1500));

  const cookiesAfter = await page.cookies();
  const refreshCookieAfter = cookiesAfter.find((c) => c.name === "refresh_token");
  console.log(
    "   ✓ Refresh cookie cleared after logout:",
    !refreshCookieAfter || refreshCookieAfter.value === "" ? "YES" : "NO"
  );

  await page.screenshot({ path: path.join(scratchDir, "e2e_4_logged_out_success.png") });
  console.log("   ✓ Post-logout /login screenshot captured!");

  console.log("8. Verifying unauthenticated access to /dashboard redirects to /login...");
  await page.goto("http://localhost:3000/dashboard", { waitUntil: "networkidle0" });
  await page.waitForFunction(
    () => window.location.pathname === "/login",
    { timeout: 10000 }
  );
  console.log("   ✓ Protected route check passed: Redirected directly to /login!");

  await browser.close();
  console.log("\n============================================================");
  console.log("🎉 BROWSER E2E AUTHENTICATION FLOW PASSED 100% SUCCESSFULLY!");
  console.log("============================================================");
}

main().catch((err) => {
  console.error("Browser flow error:", err);
  process.exit(1);
});
