import { franc } from "franc"

export class LanguageDetector {
  static detectLanguage(text) {
    try {
      // Use franc to detect language
      const detected = franc(text)

      // Map franc codes to our preferred format
      const languageMap = {
        por: "pt", // Portuguese
        eng: "en", // English
        und: "pt", // Undefined - default to Portuguese for Mozambique
      }

      return languageMap[detected] || "pt"
    } catch (error) {
      // Default to Portuguese if detection fails
      return "pt"
    }
  }

  static detectFromUrl(url) {
    // Simple URL-based detection
    if (url.includes("/en/") || url.includes("/english/")) {
      return "en"
    }

    // Default to Portuguese
    return "pt"
  }
}
