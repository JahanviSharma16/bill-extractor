const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");

const outputDir = path.join(__dirname, "..", "sample-documents");

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const createPdf = (filename, build) => {
  return new Promise((resolve, reject) => {
    const filePath = path.join(outputDir, filename);
    const doc = new PDFDocument({ margin: 50 });
    const stream = fs.createWriteStream(filePath);

    doc.pipe(stream);
    build(doc);
    doc.end();

    stream.on("finish", () => {
      console.log(`Created: ${filePath}`);
      resolve(filePath);
    });
    stream.on("error", reject);
  });
};

const header = (doc, title, subtitle) => {
  doc.fontSize(20).fillColor("#0f766e").text(title, { align: "center" });
  doc.moveDown(0.5);
  doc.fontSize(11).fillColor("#334155").text(subtitle, { align: "center" });
  doc.moveDown(1.5);
  doc.fillColor("#000000");
};

const row = (doc, label, value) => {
  doc.fontSize(11).text(`${label}:`, { continued: true, width: 200 });
  doc.text(` ${value}`);
};

async function generate() {
  await createPdf("sample-electricity-bill-tata-power.pdf", (doc) => {
    header(doc, "TATA POWER DELHI DISTRIBUTION LIMITED", "Electricity Bill / Tax Invoice");
    row(doc, "Utility Provider", "Tata Power");
    row(doc, "Consumer Number", "TPD-9876543210");
    row(doc, "Account Number", "ACC-2024-77891");
    row(doc, "Billing Period", "December 2025");
    row(doc, "Bill Date", "15-01-2026");
    row(doc, "Due Date", "05-02-2026");
    doc.moveDown();
    row(doc, "Contract Demand", "2500 KVA");
    row(doc, "Maximum Demand", "2180 KVA");
    row(doc, "Units Consumed", "154230 kWh");
    doc.moveDown();
    row(doc, "Energy Charges", "Rs. 12,85,000");
    row(doc, "GST Amount", "Rs. 2,31,300");
    row(doc, "Total Bill Amount", "Rs. 15,40,000");
    doc.moveDown(2);
    doc.fontSize(9).fillColor("#64748b").text(
      "This is a sample electricity bill for testing the Utility Bill Extraction Platform.",
      { align: "center" }
    );
  });

  await createPdf("sample-diesel-invoice-iocl.pdf", (doc) => {
    header(doc, "INDIAN OIL CORPORATION LIMITED (IOCL)", "Diesel Purchase Invoice");
    row(doc, "Supplier Name", "IOCL");
    row(doc, "Invoice Number", "IOCL/DL/2026/004521");
    row(doc, "Invoice Date", "10-01-2026");
    doc.moveDown();
    row(doc, "Product", "High Speed Diesel (HSD)");
    row(doc, "Quantity", "5000 Litres");
    row(doc, "Rate Per Litre", "Rs. 92.45");
    row(doc, "Taxable Amount", "Rs. 4,62,250");
    row(doc, "GST", "Rs. 83,205");
    row(doc, "Total Amount", "Rs. 5,45,455");
    doc.moveDown(2);
    doc.fontSize(9).fillColor("#64748b").text(
      "Sample diesel purchase invoice for extraction testing.",
      { align: "center" }
    );
  });

  await createPdf("sample-coal-invoice.pdf", (doc) => {
    header(doc, "COAL INDIA LIMITED", "Coal Purchase Invoice");
    row(doc, "Supplier Name", "Coal India Limited");
    row(doc, "Invoice Number", "CIL/INV/2026/11892");
    row(doc, "Invoice Date", "08-01-2026");
    doc.moveDown();
    row(doc, "Coal Grade", "G11 Non-Coking Coal");
    row(doc, "Quantity", "120 Tonnes");
    row(doc, "GCV", "4200 Kcal/Kg");
    row(doc, "Moisture %", "8.5%");
    row(doc, "Rate Per Tonne", "Rs. 6,800");
    row(doc, "Total Amount", "Rs. 8,16,000");
    doc.moveDown(2);
    doc.fontSize(9).fillColor("#64748b").text(
      "Sample coal purchase invoice for extraction testing.",
      { align: "center" }
    );
  });

  console.log("\nAll sample PDFs generated in sample-documents/");
}

generate().catch(console.error);
