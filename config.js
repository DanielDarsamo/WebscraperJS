export const CONFIG = {
  // Target domain configuration
  TARGET_DOMAIN: "standardbank.co.mz",
  BASE_URL: "https://www.standardbank.co.mz",

  // Scraping configuration
  MAX_CONCURRENT_PAGES: 5,
  MAX_PAGES: 1000, // Safety limit
  REQUEST_DELAY: 1000, // Delay between requests in ms

  // Content configuration
  CHUNK_SIZE: 500, // Words per chunk
  MIN_CONTENT_LENGTH: 50, // Minimum content length to save

  // File paths
  OUTPUT_FILE: "standardbank_dataset.json",
  PDFS_DIR: "downloaded_pdfs",

  // Selectors to remove (common navigation/footer elements)
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

  // PDF file extensions
  PDF_EXTENSIONS: [".pdf"],

  // User agent
  USER_AGENT:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
}
