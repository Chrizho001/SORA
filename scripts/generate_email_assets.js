const puppeteer = require("puppeteer-core");
const fs = require("fs");
const path = require("path");

async function generateAssets() {
  const browser = await puppeteer.launch({
    executablePath: "/usr/bin/google-chrome",
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    defaultViewport: { width: 800, height: 800, deviceScaleFactor: 2 },
  });

  const page = await browser.newPage();

  const backendStaticDir = path.join(
    __dirname,
    "../backend/apps/accounts/static/accounts/email"
  );
  const frontendPublicDir = path.join(
    __dirname,
    "../frontend/public/images/email"
  );

  fs.mkdirSync(backendStaticDir, { recursive: true });
  fs.mkdirSync(frontendPublicDir, { recursive: true });

  // 1. Generate SORA Brand Logo (Mark + Typography)
  const logoHtml = `
  <!DOCTYPE html>
  <html>
  <head>
    <style>
      body {
        margin: 0;
        padding: 40px;
        background: transparent;
        display: inline-flex;
        align-items: center;
        gap: 16px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      }
      .logo-mark {
        width: 44px;
        height: 44px;
      }
      .logo-text {
        font-size: 32px;
        font-weight: 700;
        letter-spacing: 0.08em;
        color: #141413;
      }
    </style>
  </head>
  <body>
    <div id="target" style="display: inline-flex; align-items: center; gap: 14px;">
      <svg class="logo-mark" viewBox="0 0 120 120" fill="#141413" stroke="#141413" stroke-width="5" stroke-linejoin="round">
        <path d="M14 34 L110 8 L78 40 L42 40 L42 70 L14 98 Z" />
        <path d="M106 86 L10 112 L42 80 L78 80 L78 50 L106 22 Z" />
      </svg>
      <span class="logo-text">SORA</span>
    </div>
  </body>
  </html>
  `;

  await page.setContent(logoHtml);
  const logoTarget = await page.$("#target");
  const logoPathBackend = path.join(backendStaticDir, "sora_logo.png");
  const logoPathFrontend = path.join(frontendPublicDir, "sora_logo.png");
  await logoTarget.screenshot({ path: logoPathBackend, omitBackground: true });
  fs.copyFileSync(logoPathBackend, logoPathFrontend);
  console.log("✓ Generated sora_logo.png");

  // 2. Generate SORA Welcome Mascot (Joyful / Happy emerald eyes)
  const welcomeMascotHtml = `
  <!DOCTYPE html>
  <html>
  <head>
    <style>
      body {
        margin: 0;
        padding: 20px;
        background: transparent;
        display: flex;
        align-items: center;
        justify-content: center;
      }
    </style>
  </head>
  <body>
    <div id="target" style="width: 260px; height: 260px; position: relative;">
      <svg viewBox="0 0 320 320" style="width: 100%; height: 100%; overflow: visible;">
        <defs>
          <linearGradient id="headGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#ffffff" />
            <stop offset="60%" stop-color="#f3f4f6" />
            <stop offset="100%" stop-color="#d1d5db" />
          </linearGradient>
          <linearGradient id="topGlare" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#ffffff" stop-opacity="0.85" />
            <stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
          </linearGradient>
          <linearGradient id="bronzeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#df9467" />
            <stop offset="40%" stop-color="#b36c42" />
            <stop offset="80%" stop-color="#d78d60" />
            <stop offset="100%" stop-color="#7a4224" />
          </linearGradient>
          <radialGradient id="bronzeCore" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#f7c5a0" />
            <stop offset="70%" stop-color="#b36c42" />
            <stop offset="100%" stop-color="#633216" />
          </radialGradient>
          <radialGradient id="visorGlass" cx="50%" cy="40%" r="70%">
            <stop offset="0%" stop-color="#1e2229" />
            <stop offset="60%" stop-color="#111317" />
            <stop offset="100%" stop-color="#08090b" />
          </radialGradient>
          <linearGradient id="visorGlare" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#ffffff" stop-opacity="0.25" />
            <stop offset="30%" stop-color="#ffffff" stop-opacity="0.08" />
            <stop offset="70%" stop-color="#ffffff" stop-opacity="0" />
          </linearGradient>
          <filter id="botShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#141413" flood-opacity="0.14" />
          </filter>
        </defs>

        <!-- Floating Soft Shadow -->
        <ellipse cx="160" cy="305" rx="65" ry="10" fill="#141413" fill-opacity="0.12" />

        <!-- Neck/Lower Base -->
        <g filter="url(#botShadow)">
          <path d="M100 230 C100 220 220 220 220 230 C225 260 215 285 160 285 C105 285 95 260 100 230 Z" fill="url(#headGrad)" stroke="#d1d5db" stroke-width="2" />
          <path d="M115 235 C130 242 190 242 205 235" fill="none" stroke="#9ca3af" stroke-width="3" stroke-linecap="round" />
          <circle cx="160" cy="260" r="6" fill="#b36c42" />
          <circle cx="160" cy="260" r="3" fill="#ffffff" />
        </g>

        <!-- Left Ear Pivot -->
        <g>
          <rect x="24" y="130" width="28" height="42" rx="10" fill="url(#bronzeGrad)" />
          <circle cx="36" cy="151" r="24" fill="url(#bronzeGrad)" stroke="#633216" stroke-width="2" />
          <circle cx="36" cy="151" r="16" fill="url(#bronzeCore)" />
          <circle cx="36" cy="151" r="8" fill="#df9467" />
          <circle cx="36" cy="151" r="4" fill="#3e1a0b" />
        </g>

        <!-- Right Ear Pivot -->
        <g>
          <rect x="268" y="130" width="28" height="42" rx="10" fill="url(#bronzeGrad)" />
          <circle cx="284" cy="151" r="24" fill="url(#bronzeGrad)" stroke="#633216" stroke-width="2" />
          <circle cx="284" cy="151" r="16" fill="url(#bronzeCore)" />
          <circle cx="284" cy="151" r="8" fill="#df9467" />
          <circle cx="284" cy="151" r="4" fill="#3e1a0b" />
        </g>

        <!-- Head Sphere -->
        <g filter="url(#botShadow)">
          <ellipse cx="160" cy="148" rx="118" ry="112" fill="url(#headGrad)" stroke="#d1d5db" stroke-width="2" />
          <path d="M80 85 C105 52 215 52 240 85 C200 68 120 68 80 85 Z" fill="url(#topGlare)" />
          <rect x="156" y="36" width="8" height="12" rx="4" fill="#d1d5db" />
          <circle cx="160" cy="34" r="5" fill="#b36c42" />

          <!-- Visor Bezel -->
          <rect x="62" y="94" width="196" height="108" rx="54" fill="#0b0d10" stroke="#2c3039" stroke-width="3" />
          <!-- Visor Interior -->
          <rect x="65" y="97" width="190" height="102" rx="51" fill="url(#visorGlass)" />
          <!-- Visor Curved Highlight -->
          <path d="M75 125 C100 105 210 105 245 125 C220 115 110 115 75 125 Z" fill="url(#visorGlare)" />
        </g>

        <!-- Joyful Eyes (Emerald Green Crescents) -->
        <g style="filter: drop-shadow(0 0 8px rgba(34, 197, 94, 0.8));">
          <path d="M102 154 C104 134 136 134 138 154" fill="none" stroke="#22c55e" stroke-width="9" stroke-linecap="round" />
          <path d="M182 154 C184 134 216 134 218 154" fill="none" stroke="#22c55e" stroke-width="9" stroke-linecap="round" />
          <!-- Cheeks -->
          <circle cx="95" cy="165" r="7" fill="#ff6b81" fill-opacity="0.4" />
          <circle cx="225" cy="165" r="7" fill="#ff6b81" fill-opacity="0.4" />
        </g>
      </svg>
    </div>
  </body>
  </html>
  `;

  await page.setContent(welcomeMascotHtml);
  const welcomeTarget = await page.$("#target");
  const welcomePathBackend = path.join(backendStaticDir, "sora_mascot_welcome.png");
  const welcomePathFrontend = path.join(frontendPublicDir, "sora_mascot_welcome.png");
  await welcomeTarget.screenshot({ path: welcomePathBackend, omitBackground: true });
  fs.copyFileSync(welcomePathBackend, welcomePathFrontend);
  console.log("✓ Generated sora_mascot_welcome.png");

  // 3. Generate SORA Security Mascot (Warm Amber focused eyes for password reset)
  const securityMascotHtml = `
  <!DOCTYPE html>
  <html>
  <head>
    <style>
      body {
        margin: 0;
        padding: 20px;
        background: transparent;
        display: flex;
        align-items: center;
        justify-content: center;
      }
    </style>
  </head>
  <body>
    <div id="target" style="width: 260px; height: 260px; position: relative;">
      <svg viewBox="0 0 320 320" style="width: 100%; height: 100%; overflow: visible;">
        <defs>
          <linearGradient id="headGrad2" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#ffffff" />
            <stop offset="60%" stop-color="#f3f4f6" />
            <stop offset="100%" stop-color="#d1d5db" />
          </linearGradient>
          <linearGradient id="topGlare2" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#ffffff" stop-opacity="0.85" />
            <stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
          </linearGradient>
          <linearGradient id="bronzeGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#df9467" />
            <stop offset="40%" stop-color="#b36c42" />
            <stop offset="80%" stop-color="#d78d60" />
            <stop offset="100%" stop-color="#7a4224" />
          </linearGradient>
          <radialGradient id="bronzeCore2" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#f7c5a0" />
            <stop offset="70%" stop-color="#b36c42" />
            <stop offset="100%" stop-color="#633216" />
          </radialGradient>
          <radialGradient id="visorGlass2" cx="50%" cy="40%" r="70%">
            <stop offset="0%" stop-color="#1e2229" />
            <stop offset="60%" stop-color="#111317" />
            <stop offset="100%" stop-color="#08090b" />
          </radialGradient>
          <linearGradient id="visorGlare2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#ffffff" stop-opacity="0.25" />
            <stop offset="30%" stop-color="#ffffff" stop-opacity="0.08" />
            <stop offset="70%" stop-color="#ffffff" stop-opacity="0" />
          </linearGradient>
          <radialGradient id="eyeAmber2" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#ffffff" />
            <stop offset="35%" stop-color="#ff9f0a" />
            <stop offset="80%" stop-color="#ff9f0a" stop-opacity="0.7" />
            <stop offset="100%" stop-color="#ff9f0a" stop-opacity="0" />
          </radialGradient>
          <filter id="botShadow2" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#141413" flood-opacity="0.14" />
          </filter>
        </defs>

        <!-- Floating Soft Shadow -->
        <ellipse cx="160" cy="305" rx="65" ry="10" fill="#141413" fill-opacity="0.12" />

        <!-- Neck/Lower Base -->
        <g filter="url(#botShadow2)">
          <path d="M100 230 C100 220 220 220 220 230 C225 260 215 285 160 285 C105 285 95 260 100 230 Z" fill="url(#headGrad2)" stroke="#d1d5db" stroke-width="2" />
          <path d="M115 235 C130 242 190 242 205 235" fill="none" stroke="#9ca3af" stroke-width="3" stroke-linecap="round" />
          <circle cx="160" cy="260" r="6" fill="#b36c42" />
          <circle cx="160" cy="260" r="3" fill="#ffffff" />
        </g>

        <!-- Left Ear Pivot -->
        <g>
          <rect x="24" y="130" width="28" height="42" rx="10" fill="url(#bronzeGrad2)" />
          <circle cx="36" cy="151" r="24" fill="url(#bronzeGrad2)" stroke="#633216" stroke-width="2" />
          <circle cx="36" cy="151" r="16" fill="url(#bronzeCore2)" />
          <circle cx="36" cy="151" r="8" fill="#df9467" />
          <circle cx="36" cy="151" r="4" fill="#3e1a0b" />
        </g>

        <!-- Right Ear Pivot -->
        <g>
          <rect x="268" y="130" width="28" height="42" rx="10" fill="url(#bronzeGrad2)" />
          <circle cx="284" cy="151" r="24" fill="url(#bronzeGrad2)" stroke="#633216" stroke-width="2" />
          <circle cx="284" cy="151" r="16" fill="url(#bronzeCore2)" />
          <circle cx="284" cy="151" r="8" fill="#df9467" />
          <circle cx="284" cy="151" r="4" fill="#3e1a0b" />
        </g>

        <!-- Head Sphere -->
        <g filter="url(#botShadow2)">
          <ellipse cx="160" cy="148" rx="118" ry="112" fill="url(#headGrad2)" stroke="#d1d5db" stroke-width="2" />
          <path d="M80 85 C105 52 215 52 240 85 C200 68 120 68 80 85 Z" fill="url(#topGlare2)" />
          <rect x="156" y="36" width="8" height="12" rx="4" fill="#d1d5db" />
          <circle cx="160" cy="34" r="5" fill="#b36c42" />

          <!-- Visor Bezel -->
          <rect x="62" y="94" width="196" height="108" rx="54" fill="#0b0d10" stroke="#2c3039" stroke-width="3" />
          <!-- Visor Interior -->
          <rect x="65" y="97" width="190" height="102" rx="51" fill="url(#visorGlass2)" />
          <!-- Visor Curved Highlight -->
          <path d="M75 125 C100 105 210 105 245 125 C220 115 110 115 75 125 Z" fill="url(#visorGlare2)" />
        </g>

        <!-- Focused Glowing Eyes (Amber Gold Ring) -->
        <g style="filter: drop-shadow(0 0 10px rgba(255, 159, 10, 0.85));">
          <circle cx="120" cy="148" r="18" fill="none" stroke="#ff9f0a" stroke-width="5" />
          <circle cx="120" cy="148" r="7" fill="url(#eyeAmber2)" />
          <circle cx="120" cy="148" r="3.5" fill="#ffffff" />
          <circle cx="124" cy="144" r="1.5" fill="#ffffff" />

          <circle cx="200" cy="148" r="18" fill="none" stroke="#ff9f0a" stroke-width="5" />
          <circle cx="200" cy="148" r="7" fill="url(#eyeAmber2)" />
          <circle cx="200" cy="148" r="3.5" fill="#ffffff" />
          <circle cx="204" cy="144" r="1.5" fill="#ffffff" />
        </g>
      </svg>
    </div>
  </body>
  </html>
  `;

  await page.setContent(securityMascotHtml);
  const securityTarget = await page.$("#target");
  const securityPathBackend = path.join(backendStaticDir, "sora_mascot_security.png");
  const securityPathFrontend = path.join(frontendPublicDir, "sora_mascot_security.png");
  await securityTarget.screenshot({ path: securityPathBackend, omitBackground: true });
  fs.copyFileSync(securityPathBackend, securityPathFrontend);
  console.log("✓ Generated sora_mascot_security.png");

  await browser.close();
  console.log("All email graphic assets generated successfully!");
}

generateAssets().catch((err) => {
  console.error(err);
  process.exit(1);
});
