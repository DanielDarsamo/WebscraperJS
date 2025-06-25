import { chromium } from "playwright"
import { URL } from "url"

// Configuration for the demo run
const CONFIG = {
  TARGET_DOMAIN: "standardbank.co.mz",
  BASE_URL: "https://www.standardbank.co.mz",
  MAX_CONCURRENT_PAGES: 2, // Reduced for demo
  MAX_PAGES: 10, // Limited for demo
  REQUEST_DELAY: 2000,
  CHUNK_SIZE: 300, // Smaller chunks for demo
  MIN_CONTENT_LENGTH: 50,
  OUTPUT_FILE: "standardbank_dataset.json",
  REMOVE_SELECTORS: [
    "nav",
    "header",
    "footer",
    ".cookie-banner",
    ".cookie-notice",
    ".navigation",
    ".breadcrumb",
    ".social-media",
    ".advertisement",
    '[class*="cookie"]',
    '[id*="cookie"]',
  ],
  USER_AGENT:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
}

// Simple content cleaner
class ContentCleaner {
  static cleanHtmlContent(html, url) {
    // Simple text extraction - remove HTML tags
    let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    text = text.replace(/<[^>]+>/g, " ")
    text = text.replace(/\s+/g, " ").trim()

    return text
  }

  static chunkText(text, chunkSize = CONFIG.CHUNK_SIZE) {
    const words = text.split(" ")
    const chunks = []

    for (let i = 0; i < words.length; i += chunkSize) {
      const chunk = words.slice(i, i + chunkSize).join(" ")
      if (chunk.length >= CONFIG.MIN_CONTENT_LENGTH) {
        chunks.push(chunk)
      }
    }

    return chunks.length > 0 ? chunks : [text]
  }
}

// Language detector
class LanguageDetector {
  static detectLanguage(text) {
    // Simple Portuguese detection
    const portugueseWords = ["banco", "conta", "cartão", "serviços", "produtos", "crédito"]
    const englishWords = ["bank", "account", "card", "services", "products", "credit"]

    const textLower = text.toLowerCase()
    const ptCount = portugueseWords.filter((word) => textLower.includes(word)).length
    const enCount = englishWords.filter((word) => textLower.includes(word)).length

    return ptCount > enCount ? "pt" : "en"
  }

  static detectFromUrl(url) {
    if (url.includes("/en/") || url.includes("/english/")) {
      return "en"
    }
    return "pt"
  }
}

// Main scraper class
class StandardBankScraper {
  constructor() {
    this.visitedUrls = new Set()
    this.urlQueue = []
    this.scrapedData = []
    this.browser = null
  }

  async initialize() {
    console.log("🚀 Initializing Standard Bank Scraper...")

    this.browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    })

    console.log("✅ Browser initialized")
  }

  async scrape() {
    try {
      await this.initialize()

      // Start with the homepage
      this.urlQueue.push(CONFIG.BASE_URL)

      console.log(`📊 Starting scrape of ${CONFIG.TARGET_DOMAIN}`)
      console.log(`📋 Max pages limit: ${CONFIG.MAX_PAGES}`)

      // Process URLs
      while (this.urlQueue.length > 0 && this.scrapedData.length < CONFIG.MAX_PAGES) {
        const url = this.urlQueue.shift()
        if (!this.visitedUrls.has(url)) {
          await this.processUrl(url)
          await this.delay(CONFIG.REQUEST_DELAY)
        }
      }

      console.log(`✅ Scraping completed! Processed ${this.scrapedData.length} items`)

      // Save results
      await this.saveResults()
    } catch (error) {
      console.error("❌ Scraping failed:", error.message)
    } finally {
      await this.cleanup()
    }
  }

  async processUrl(url) {
    if (this.visitedUrls.has(url)) {
      return
    }

    this.visitedUrls.add(url)

    try {
      console.log(`🔍 Processing: ${url}`)
      await this.processHTMLPage(url)
    } catch (error) {
      console.error(`❌ Error processing ${url}:`, error.message)
    }
  }

  async processHTMLPage(url) {
    const page = await this.browser.newPage()

    try {
      // Set user agent
      await page.setUserAgent(CONFIG.USER_AGENT)

      // Navigate to page with timeout
      await page.goto(url, {
        waitUntil: "networkidle",
        timeout: 15000,
      })

      // Get page content
      const content = await page.content()
      const title = await page.title()

      // Extract and clean text content
      const cleanText = ContentCleaner.cleanHtmlContent(content, url)

      if (cleanText.length >= CONFIG.MIN_CONTENT_LENGTH) {
        // Detect language
        const language = LanguageDetector.detectLanguage(cleanText) || LanguageDetector.detectFromUrl(url)

        // Chunk the content
        const chunks = ContentCleaner.chunkText(cleanText)

        // Add each chunk as a separate entry
        chunks.forEach((chunk, index) => {
          this.scrapedData.push({
            source_url: url,
            type: "html",
            language: language,
            content: chunk,
            title: title,
            chunk_index: chunks.length > 1 ? index + 1 : null,
            total_chunks: chunks.length > 1 ? chunks.length : null,
            scraped_at: new Date().toISOString(),
          })
        })

        console.log(`✅ Scraped: ${url} (${chunks.length} chunks, ${cleanText.length} chars)`)
      }

      // Extract links for further crawling (limited for demo)
      const links = await page.$$eval(
        "a[href]",
        (anchors) =>
          anchors
            .map((a) => a.href)
            .filter((href) => href)
            .slice(0, 5), // Limit links for demo
      )

      // Add internal links to queue
      this.addLinksToQueue(links, url)
    } catch (error) {
      console.error(`❌ Page error for ${url}:`, error.message)
    } finally {
      await page.close()
    }
  }

  addLinksToQueue(links, currentUrl) {
    links.forEach((link) => {
      try {
        const absoluteUrl = new URL(link, currentUrl).href
        const urlObj = new URL(absoluteUrl)

        // Only add internal links
        if (
          urlObj.hostname.includes(CONFIG.TARGET_DOMAIN) &&
          !this.visitedUrls.has(absoluteUrl) &&
          !this.urlQueue.includes(absoluteUrl) &&
          this.urlQueue.length < 20
        ) {
          // Limit queue size for demo
          this.urlQueue.push(absoluteUrl)
        }
      } catch (error) {
        // Invalid URL, skip
      }
    })
  }

  async saveResults() {
    try {
      console.log("💾 Saving results...")

      // Create summary
      const summary = {
        total_items: this.scrapedData.length,
        html_pages: this.scrapedData.filter((item) => item.type === "html").length,
        pdf_documents: this.scrapedData.filter((item) => item.type === "pdf").length,
        languages: [...new Set(this.scrapedData.map((item) => item.language))],
        scraped_at: new Date().toISOString(),
        domain: CONFIG.TARGET_DOMAIN,
      }

      const output = {
        summary,
        data: this.scrapedData,
      }

      // For demo, we'll just log the results instead of writing to file
      console.log("📊 Scraping Results Summary:")
      console.log(JSON.stringify(summary, null, 2))

      console.log("\n📄 Sample scraped content:")
      if (this.scrapedData.length > 0) {
        const sample = this.scrapedData[0]
        console.log(`URL: ${sample.source_url}`)
        console.log(`Language: ${sample.language}`)
        console.log(`Content preview: ${sample.content.substring(0, 200)}...`)
      }

      console.log(`\n✅ Would save ${this.scrapedData.length} items to ${CONFIG.OUTPUT_FILE}`)
    } catch (error) {
      console.error("❌ Error saving results:", error)
    }
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close()
      console.log("🧹 Browser closed")
    }
  }

  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

// Run the scraper
async function main() {
  console.log("🌟 Starting Standard Bank Mozambique Web Scraper Demo")
  console.log("⚠️  This is a limited demo run with reduced limits")

  const scraper = new StandardBankScraper()
  await scraper.scrape()

  console.log("\n🎉 Demo completed!")
  console.log("💡 To run the full scraper, use the complete version with all features enabled.")
}

// Handle process termination
process.on("SIGINT", () => {
  console.log("\n🛑 Scraping interrupted by user")
  process.exit(0)
})

// Start scraping
main().catch((error) => {
  console.error("❌ Demo failed:", error.message)
})
