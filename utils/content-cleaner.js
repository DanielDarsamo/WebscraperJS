import { load } from "cheerio"
import { CONFIG } from "../config.js"

export class ContentCleaner {
  static cleanHtmlContent(html, url) {
    const $ = load(html)

    // Remove unwanted elements
    CONFIG.REMOVE_SELECTORS.forEach((selector) => {
      $(selector).remove()
    })

    // Remove script and style tags
    $("script, style, noscript").remove()

    // Remove comments
    $("*")
      .contents()
      .filter(function () {
        return this.nodeType === 8 // Comment node
      })
      .remove()

    // Get main content areas (prioritize main content)
    const contentSelectors = [
      "main",
      '[role="main"]',
      ".main-content",
      ".content",
      ".page-content",
      "article",
      ".article-content",
    ]

    let mainContent = ""
    for (const selector of contentSelectors) {
      const element = $(selector)
      if (element.length > 0) {
        mainContent = element.text()
        break
      }
    }

    // If no main content found, get body text
    if (!mainContent) {
      mainContent = $("body").text()
    }

    // Clean up the text
    return this.cleanText(mainContent)
  }

  static cleanText(text) {
    return (
      text
        // Remove extra whitespace
        .replace(/\s+/g, " ")
        // Remove special characters but keep Portuguese characters
        .replace(/[^\w\s\u00C0-\u017F.,!?;:()\-"']/g, "")
        // Remove multiple punctuation
        .replace(/[.,!?;:]{2,}/g, ".")
        // Trim
        .trim()
    )
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
