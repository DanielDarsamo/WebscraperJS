import { chromium } from "playwright"
import fs from "fs/promises"
import { URL } from "url"
import { CONFIG } from "./config.js"
import { ContentCleaner } from "./utils/content-cleaner.js"
import { PDFProcessor } from "./utils/pdf-processor.js"
import { LanguageDetector } from "./utils/language-detector.js"

class StandardBankScraper {
  constructor() {
    this.visitedUrls = new Set()
    this.urlQueue = []
    this.scrapedData = []
    this.pdfProcessor = new PDFProcessor()
    this.browser = null
    this.activeTasks = 0
    this.maxConcurrent = CONFIG.MAX_CONCURRENT_PAGES
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
      console.log(`📋 Max concurrent pages: ${this.maxConcurrent}`)
      console.log(`📄 Max pages limit: ${CONFIG.MAX_PAGES}`)

      // Process URLs with concurrency control
      while (this.urlQueue.length > 0 && this.scrapedData.length < CONFIG.MAX_PAGES) {
        const tasks = []

        // Create concurrent tasks up to the limit
        while (tasks.length < this.maxConcurrent && this.urlQueue.length > 0) {
          const url = this.urlQueue.shift()
          if (!this.visitedUrls.has(url)) {
            tasks.push(this.processUrl(url))
          }
        }

        if (tasks.length > 0) {
          await Promise.allSettled(tasks)
        }

        // Add delay between batches
        if (this.urlQueue.length > 0) {
          await this.delay(CONFIG.REQUEST_DELAY)
        }
      }

      console.log(`✅ Scraping completed! Processed ${this.scrapedData.length} items`)

      // Save results
      await this.saveResults()
    } catch (error) {
      console.error("❌ Scraping failed:", error)
    } finally {
      await this.cleanup()
    }
  }

  async processUrl(url) {
    if (this.visitedUrls.has(url)) {
      return
    }

    this.visitedUrls.add(url)
    this.activeTasks++

    try {
      console.log(`🔍 Processing: ${url}`)

      // Check if it's a PDF
      if (this.pdfProcessor.isPDFUrl(url)) {
        await this.processPDF(url)
      } else {
        await this.processHTMLPage(url)
      }
    } catch (error) {
      console.error(`❌ Error processing ${url}:`, error.message)
    } finally {
      this.activeTasks--
    }
  }

  async processHTMLPage(url) {
    const page = await this.browser.newPage()

    try {
      // Set user agent
      await page.setUserAgent(CONFIG.USER_AGENT)

      // Navigate to page
      await page.goto(url, {
        waitUntil: "networkidle",
        timeout: 30000,
      })

      // Get page content
      const content = await page.content()

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
            chunk_index: chunks.length > 1 ? index + 1 : null,
            total_chunks: chunks.length > 1 ? chunks.length : null,
            scraped_at: new Date().toISOString(),
          })
        })

        console.log(`✅ Scraped: ${url} (${chunks.length} chunks, ${cleanText.length} chars)`)
      }

      // Extract links for further crawling
      const links = await page.$$eval("a[href]", (anchors) => anchors.map((a) => a.href).filter((href) => href))

      // Add internal links to queue
      this.addLinksToQueue(links, url)

      // Look for PDF links
      const pdfLinks = links.filter((link) => this.pdfProcessor.isPDFUrl(link))
      pdfLinks.forEach((pdfLink) => {
        if (!this.visitedUrls.has(pdfLink)) {
          this.urlQueue.push(pdfLink)
        }
      })
    } finally {
      await page.close()
    }
  }

  async processPDF(pdfUrl) {
    const result = await this.pdfProcessor.downloadAndProcessPDF(pdfUrl, CONFIG.BASE_URL)

    if (result.success && result.text.length >= CONFIG.MIN_CONTENT_LENGTH) {
      // Detect language
      const language = LanguageDetector.detectLanguage(result.text) || LanguageDetector.detectFromUrl(pdfUrl)

      // Chunk the PDF content
      const chunks = ContentCleaner.chunkText(result.text)

      // Add each chunk as a separate entry
      chunks.forEach((chunk, index) => {
        this.scrapedData.push({
          source_url: pdfUrl,
          type: "pdf",
          language: language,
          content: chunk,
          chunk_index: chunks.length > 1 ? index + 1 : null,
          total_chunks: chunks.length > 1 ? chunks.length : null,
          pdf_pages: result.pages,
          filename: result.filename,
          scraped_at: new Date().toISOString(),
        })
      })

      console.log(`✅ PDF processed: ${pdfUrl} (${chunks.length} chunks)`)
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
          !this.urlQueue.includes(absoluteUrl)
        ) {
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

      await fs.writeFile(CONFIG.OUTPUT_FILE, JSON.stringify(output, null, 2), "utf8")

      console.log(`✅ Results saved to ${CONFIG.OUTPUT_FILE}`)
      console.log(`📊 Summary:`, summary)
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
  const scraper = new StandardBankScraper()
  await scraper.scrape()
}

// Handle process termination
process.on("SIGINT", () => {
  console.log("\n🛑 Scraping interrupted by user")
  process.exit(0)
})

process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled Rejection at:", promise, "reason:", reason)
})

// Start scraping
main().catch(console.error)
