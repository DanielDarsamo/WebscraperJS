import { spawn } from "child_process"
import { fileURLToPath } from "url"
import { dirname } from "path"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

console.log("🔧 Installing Playwright browsers...")

// Install Playwright browsers first
const installProcess = spawn("npx", ["playwright", "install"], {
  stdio: "inherit",
  cwd: __dirname,
})

installProcess.on("close", (code) => {
  if (code === 0) {
    console.log("✅ Playwright browsers installed successfully")
    console.log("🚀 Starting scraper...")

    // Run the scraper
    const scraperProcess = spawn("node", ["scraper.js"], {
      stdio: "inherit",
      cwd: __dirname,
    })

    scraperProcess.on("close", (scraperCode) => {
      console.log(`\n🏁 Scraper finished with code ${scraperCode}`)
    })
  } else {
    console.error("❌ Failed to install Playwright browsers")
    process.exit(1)
  }
})
