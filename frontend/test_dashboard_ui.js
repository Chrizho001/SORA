/* eslint-disable */
const puppeteer = require("puppeteer-core");
const path = require("path");
const fs = require("fs");

async function run() {
  console.log("Starting Dashboard UI automated verification...");
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
  await page.type("#login-email", "student@sora.study", { delay: 20 });
  await page.type("#login-password", "Password123!", { delay: 20 });
  await page.click('button[type="submit"]');

  console.log("2. Waiting for /dashboard navigation...");
  await page.waitForFunction(() => window.location.pathname === "/dashboard", { timeout: 15000 });
  await new Promise((r) => setTimeout(r, 2000));

  // 3. Desktop Screenshot
  console.log("3. Capturing desktop dashboard screenshot...");
  await page.screenshot({ path: path.join(scratchDir, "dashboard_desktop.png"), fullPage: false });

  // 4. Test Task Creation Modal
  console.log("4. Opening Task Creation Modal...");
  const addTaskButtons = await page.$$('button');
  for (const btn of addTaskButtons) {
    const text = await (await btn.getProperty('innerText')).jsonValue();
    if (text && text.includes('Add Task')) {
      await btn.click();
      break;
    }
  }
  await new Promise((r) => setTimeout(r, 800));
  await page.screenshot({ path: path.join(scratchDir, "dashboard_task_modal.png") });

  // Close modal by clicking Cancel
  const cancelButtons = await page.$$('button');
  for (const btn of cancelButtons) {
    const text = await (await btn.getProperty('innerText')).jsonValue();
    if (text && text.includes('Cancel')) {
      await btn.click();
      break;
    }
  }
  await new Promise((r) => setTimeout(r, 500));

  // 5. Test Upload PDF Modal
  console.log("5. Opening Upload PDF Modal...");
  for (const btn of await page.$$('button')) {
    const text = await (await btn.getProperty('innerText')).jsonValue();
    if (text && text.includes('Upload PDF')) {
      await btn.click();
      break;
    }
  }
  await new Promise((r) => setTimeout(r, 800));
  await page.screenshot({ path: path.join(scratchDir, "dashboard_upload_modal.png") });

  // Close upload modal
  for (const btn of await page.$$('button')) {
    const text = await (await btn.getProperty('innerText')).jsonValue();
    if (text && text.includes('Cancel')) {
      await btn.click();
      break;
    }
  }
  await new Promise((r) => setTimeout(r, 500));

  // 6. Test Flashcards View
  console.log("6. Navigating to Flashcards tab...");
  for (const btn of await page.$$('button')) {
    const text = await (await btn.getProperty('innerText')).jsonValue();
    if (text && text.trim() === 'Flashcards') {
      await btn.click();
      break;
    }
  }
  await new Promise((r) => setTimeout(r, 800));
  await page.screenshot({ path: path.join(scratchDir, "dashboard_flashcards.png") });

  // 7. Test Speed Quizzes View
  console.log("7. Navigating to Speed Quizzes tab...");
  for (const btn of await page.$$('button')) {
    const text = await (await btn.getProperty('innerText')).jsonValue();
    if (text && text.includes('Speed Quizzes')) {
      await btn.click();
      break;
    }
  }
  await new Promise((r) => setTimeout(r, 800));
  await page.screenshot({ path: path.join(scratchDir, "dashboard_quizzes.png") });

  // 8. Test Schedule & Tasks View
  console.log("8. Navigating to Schedule & Tasks tab...");
  for (const btn of await page.$$('button')) {
    const text = await (await btn.getProperty('innerText')).jsonValue();
    if (text && text.includes('Schedule & Tasks')) {
      await btn.click();
      break;
    }
  }
  await new Promise((r) => setTimeout(r, 800));
  await page.screenshot({ path: path.join(scratchDir, "dashboard_tasks_view.png") });

  // 9. Mobile Responsive View
  console.log("9. Emulating mobile viewport (390x844)...");
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  // Go back to Dashboard home
  for (const btn of await page.$$('button')) {
    const text = await (await btn.getProperty('innerText')).jsonValue();
    if (text && (text.trim() === 'Dashboard' || text.trim() === 'Home')) {
      await btn.click();
      break;
    }
  }
  await new Promise((r) => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(scratchDir, "dashboard_mobile.png") });

  await browser.close();
  console.log("\n✅ ALL DASHBOARD SCREENSHOTS CAPTURED SUCCESSFULLY!");
}

run().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});
