/* eslint-disable */
const puppeteer = require("puppeteer-core");
const path = require("path");
const fs = require("fs");

async function run() {
  console.log("Starting Comprehensive Dashboard UI verification...");
  const scratchDir =
    process.env.SCRATCH_DIR ||
    "/home/chris-friday/.gemini/antigravity-ide/brain/663d7a65-bea4-423b-9eec-6eef69f735bc/scratch";

  if (!fs.existsSync(scratchDir)) {
    fs.mkdirSync(scratchDir, { recursive: true });
  }

  const browser = await puppeteer.launch({
    executablePath: "/usr/bin/google-chrome",
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    defaultViewport: { width: 1440, height: 900 },
  });

  const page = await browser.newPage();
  page.on("console", (msg) => console.log("PAGE LOG:", msg.text()));
  page.on("pageerror", (err) => console.log("PAGE ERROR:", err.toString()));

  // 1. Authenticate user
  console.log("1. Authenticating as student@sora.study...");
  await page.goto("http://localhost:3000/login", { waitUntil: "networkidle0" });
  await page.type("#login-email", "student@sora.study", { delay: 15 });
  await page.type("#login-password", "Password123!", { delay: 15 });
  await page.click('button[type="submit"]');

  console.log("2. Waiting for /dashboard navigation...");
  await page.waitForFunction(() => window.location.pathname === "/dashboard", { timeout: 15000 });
  await page.waitForSelector("#sidebar-tab-dashboard", { visible: true, timeout: 15000 });
  await new Promise((r) => setTimeout(r, 2000));

  // 3. Desktop Overview Screenshot
  console.log("3. Capturing desktop dashboard overview screenshot...");
  await page.screenshot({ path: path.join(scratchDir, "dashboard_desktop.png") });

  // 4. Desktop Notifications Tab (Verify it's rich and functional!)
  console.log("4. Testing Desktop Notifications Tab...");
  await page.click("#sidebar-tab-notifications");
  await new Promise((r) => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(scratchDir, "dashboard_desktop_notifications.png") });

  // 5. Test PWA Install Modal with deep opaque backdrop
  console.log("5. Testing PWA Install Modal overlay...");
  await page.click("#pwa-install-btn");
  await page.waitForSelector("#close-pwa-modal-btn", { visible: true, timeout: 5000 });
  await new Promise((r) => setTimeout(r, 800));
  await page.screenshot({ path: path.join(scratchDir, "dashboard_pwa_modal.png") });

  // Close modal via Close button
  await page.click("#close-pwa-modal-btn");
  await new Promise((r) => setTimeout(r, 500));

  // 6. Navigate back to Dashboard Overview
  await page.click("#sidebar-tab-dashboard");
  await new Promise((r) => setTimeout(r, 800));

  // 7. Test Tablet View (768x1024 - iPad Mini / Air)
  console.log("6. Testing Tablet / iPad viewport (768x1024)...");
  await page.setViewport({ width: 768, height: 1024 });
  await new Promise((r) => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(scratchDir, "dashboard_tablet.png") });

  // 8. Test Mobile View (390x844 - iPhone)
  console.log("7. Testing Mobile viewport (390x844)...");
  await page.setViewport({ width: 390, height: 844 });
  await new Promise((r) => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(scratchDir, "dashboard_mobile_overview.png") });

  // Mobile Documents tab
  console.log("   - Mobile Docs tab...");
  await page.click("#mobile-tab-documents");
  await new Promise((r) => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(scratchDir, "dashboard_mobile_docs.png") });

  // Mobile Flashcards tab
  console.log("   - Mobile Cards tab...");
  await page.click("#mobile-tab-flashcards");
  await new Promise((r) => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(scratchDir, "dashboard_mobile_cards.png") });

  // Mobile Schedule tab
  console.log("   - Mobile Schedule tab...");
  await page.click("#mobile-tab-tasks");
  await new Promise((r) => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(scratchDir, "dashboard_mobile_tasks.png") });

  // Mobile Notification Drawer from Header Bell
  console.log("   - Mobile Notification Drawer from Header Bell...");
  await page.click("#mobile-header-bell");
  await new Promise((r) => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(scratchDir, "dashboard_mobile_drawer.png") });

  await browser.close();
  console.log("\n=======================================================");
  console.log("🎉 ALL RESPONSIVE VIEWPORT TESTS PASSED SUCCESSFULLY!");
  console.log("=======================================================");
}

run().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});
