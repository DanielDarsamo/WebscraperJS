import fs from "fs/promises"
import path from "path"
import axios from "axios"
import pdfParse from "pdf-parse"
import { CONFIG } from "../config.js"
import { ContentCleaner } from "./content-cleaner.js"

export class PDFProcessor {
  constructor() {
    this.ensureDirectoryExists()
  }

  async ensureDirectoryExists() {
    try {
      await fs.mkdir(CONFIG.PDFS_DIR, { recursive: true })
    } catch (error) {
      console.error("Error creating PDFs directory:", error)
    }
  }

  async downloadAndProcessPDF(pdfUrl, baseUrl) {
    try {
      console.log(`📄 Processing PDF: ${pdfUrl}`)

      // Create absolute URL if relative
      const absoluteUrl = new URL(pdfUrl, baseUrl).href

      // Download PDF
      const response = await axios.get(absoluteUrl, {
        responseType: "arraybuffer",
        timeout: 30000,
        headers: {
          "User-Agent": CONFIG.USER_AGENT,
        },
      })

      // Generate filename
      const filename = this.generateFilename(pdfUrl)
      const filepath = path.join(CONFIG.PDFS_DIR, filename)

      // Save PDF file
      await fs.writeFile(filepath, response.data)

      // Extract text from PDF
      const pdfBuffer = Buffer.from(response.data)
      const pdfData = await pdfParse(pdfBuffer)

      // Clean extracted text
      const cleanText = ContentCleaner.cleanText(pdfData.text)

      console.log(`✅ PDF processed: ${filename} (${cleanText.length} characters)`)

      return {
        success: true,
        text: cleanText,
        filename: filename,
        pages: pdfData.numpages,
      }
    } catch (error) {
      console.error(`❌ Error processing PDF ${pdfUrl}:`, error.message)
      return {
        success: false,
        error: error.message,
      }
    }
  }

  generateFilename(pdfUrl) {
    const urlPath = new URL(pdfUrl, "https://example.com").pathname
    const filename = path.basename(urlPath) || "document.pdf"

    // Ensure .pdf extension
    if (!filename.toLowerCase().endsWith(".pdf")) {
      return filename + ".pdf"
    }

    return filename
  }

  isPDFUrl(url) {
    const urlLower = url.toLowerCase()
    return CONFIG.PDF_EXTENSIONS.some((ext) => urlLower.includes(ext))
  }
}
