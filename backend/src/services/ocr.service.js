const fs = require("fs");
const path = require("path");
const pdfParse = require("pdf-parse");
const Tesseract = require("tesseract.js");
const { fromPath } = require("pdf2pic");

const performOCR = async (imagePath) => {
  const result = await Tesseract.recognize(imagePath, "eng");
  return result.data.text;
};

const extractPdfText = async (filePath) => {
  const buffer = fs.readFileSync(filePath);
  const data = await pdfParse(buffer);
  return data.text;
};

const extractPdfTextViaOCR = async (filePath) => {
  const outputDir = path.join(path.dirname(filePath), "ocr-temp");

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const converter = fromPath(filePath, {
    density: 300,
    saveFilename: "page",
    savePath: outputDir,
    format: "png",
    width: 2000,
    height: 2800,
  });

  const pages = await converter.bulk(-1, { responseType: "image" });
  let combinedText = "";

  for (const page of pages) {
    const text = await performOCR(page.path);
    combinedText += `${text}\n`;

    if (fs.existsSync(page.path)) {
      fs.unlinkSync(page.path);
    }
  }

  return combinedText;
};

const hasEnoughText = (text) => {
  return text && text.trim().length > 100;
};

const combineExtractedContent = (directText, ocrText) => {
  const direct = (directText || "").trim();
  const ocr = (ocrText || "").trim();

  if (!direct) return ocr;
  if (!ocr) return direct;
  if (direct.includes(ocr) || ocr.includes(direct)) {
    return direct.length >= ocr.length ? direct : ocr;
  }

  return `${direct}\n\n--- OCR Supplement ---\n\n${ocr}`;
};

const processDocument = async (filePath, mimeType) => {
  let text = "";
  let ocrMethod = "direct";

  if (mimeType === "application/pdf") {
    const directText = await extractPdfText(filePath);

    if (!hasEnoughText(directText)) {
      try {
        const ocrText = await extractPdfTextViaOCR(filePath);
        text = combineExtractedContent(directText, ocrText);
        ocrMethod = "hybrid_ocr";
      } catch (error) {
        if (directText?.trim()) {
          console.warn(
            "OCR fallback unavailable (install GraphicsMagick + Ghostscript). Using direct PDF text only."
          );
          text = directText;
          ocrMethod = "pdf_parse_limited";
        } else {
          throw new Error(
            "PDF OCR requires GraphicsMagick and Ghostscript. Install with: brew install graphicsmagick ghostscript"
          );
        }
      }
    } else {
      text = directText;
      ocrMethod = "pdf_parse";
    }
  } else {
    text = await performOCR(filePath);
    ocrMethod = "tesseract";
  }

  return { text, ocrMethod };
};

module.exports = {
  extractPdfText,
  hasEnoughText,
  performOCR,
  combineExtractedContent,
  processDocument,
};
