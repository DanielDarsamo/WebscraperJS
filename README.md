# Standard Bank Mozambique Web Scraper

A comprehensive web scraper built with Node.js and Playwright to extract content from the Standard Bank Mozambique website for building a banking chatbot.

## Features

- **Complete Domain Crawling**: Navigates the entire standardbank.co.mz domain
- **Content Extraction**: Extracts clean text from HTML pages
- **PDF Processing**: Downloads and extracts text from PDF documents
- **Language Detection**: Automatically detects Portuguese and English content
- **Content Chunking**: Splits content into ~500 word chunks for embeddings
- **Concurrency**: Processes multiple pages simultaneously
- **Duplicate Prevention**: Avoids re-scraping visited URLs
- **Error Handling**: Comprehensive error handling and logging
- **Structured Output**: Saves data in structured JSON format

## Installation

1. Install dependencies:
\`\`\`bash
npm install
\`\`\`

2. Install Playwright browsers:
\`\`\`bash
npm run install-browsers
\`\`\`

## Usage

### Quick Start
\`\`\`bash
npm start
\`\`\`

### Manual Run
\`\`\`bash
node scraper.js
\`\`\`

### With Browser Installation
\`\`\`bash
node run-scraper.js
\`\`\`

## Configuration

Edit `config.js` to customize:

- `MAX_CONCURRENT_PAGES`: Number of concurrent pages to process
- `MAX_PAGES`: Maximum number of pages to scrape
- `CHUNK_SIZE`: Words per content chunk
- `REQUEST_DELAY`: Delay between requests
- `REMOVE_SELECTORS`: HTML elements to remove

## Output Format

The scraper generates `standardbank_dataset.json` with this structure:

\`\`\`json
{
  "summary": {
    "total_items": 150,
    "html_pages": 120,
    "pdf_documents": 30,
    "languages": ["pt", "en"],
    "scraped_at": "2024-01-15T10:30:00.000Z",
    "domain": "standardbank.co.mz"
  },
  "data": [
    {
      "source_url": "https://www.standardbank.co.mz/page",
      "type": "html",
      "language": "pt",
      "content": "Clean extracted text content...",
      "chunk_index": 1,
      "total_chunks": 3,
      "scraped_at": "2024-01-15T10:30:00.000Z"
    }
  ]
}
\`\`\`

## Features Explained

### Content Cleaning
- Removes navigation, headers, footers, cookie banners
- Extracts main content areas
- Cleans up whitespace and special characters
- Preserves Portuguese characters

### PDF Processing
- Downloads PDF files to `downloaded_pdfs/` directory
- Extracts text using pdf-parse
- Associates extracted text with source URL
- Handles PDF-specific metadata

### Language Detection
- Uses the `franc` library for automatic detection
- Falls back to URL-based detection
- Defaults to Portuguese for Mozambique content

### Concurrency Control
- Processes multiple pages simultaneously
- Respects rate limits with configurable delays
- Prevents overwhelming the target server

## Error Handling

- Network timeouts and retries
- Invalid URL handling
- PDF processing errors
- Memory management for large sites
- Graceful shutdown on interruption

## Monitoring

The scraper provides real-time logging:
- ✅ Successful page processing
- 📄 PDF document processing
- ❌ Error notifications
- 📊 Progress statistics

## Limitations

- Respects robots.txt (configure if needed)
- Limited to public content only
- PDF text extraction quality depends on PDF structure
- Memory usage scales with concurrent pages

## Troubleshooting

### Common Issues

1. **Browser installation fails**:
   \`\`\`bash
   npx playwright install --force
   \`\`\`

2. **Memory issues with large sites**:
   - Reduce `MAX_CONCURRENT_PAGES`
   - Increase `REQUEST_DELAY`

3. **PDF processing errors**:
   - Check PDF accessibility
   - Verify network connectivity

### Debug Mode

Set environment variable for verbose logging:
\`\`\`bash
DEBUG=1 node scraper.js
