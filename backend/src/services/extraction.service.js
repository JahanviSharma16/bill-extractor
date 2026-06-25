const groq = require("../config/groq");
const { validateExtraction } = require("./validation.service");

const DOCUMENT_TYPES = [
  "electricity_bill",
  "diesel_invoice",
  "coal_invoice",
  "water_bill",
  "gas_bill",
  "lpg_bill",
  "steam_bill",
  "renewable_energy_certificate",
  "fuel_transport_invoice",
];

const FIELD_PROMPTS = {
  electricity_bill: `Extract these fields as JSON:
utility_provider, consumer_number, account_number, billing_period, bill_date (YYYY-MM-DD),
due_date (YYYY-MM-DD), units_consumed_kwh (number), contract_demand, maximum_demand,
total_amount (number), gst_amount (number). Use null for missing values.`,

  diesel_invoice: `Extract these fields as JSON:
supplier_name, invoice_number, invoice_date (YYYY-MM-DD), quantity_litres (number),
rate_per_litre (number), total_amount (number). Use null for missing values.`,

  coal_invoice: `Extract these fields as JSON:
supplier_name, invoice_number, invoice_date (YYYY-MM-DD), coal_grade,
quantity_tonnes (number), gcv, moisture_percent, total_amount (number). Use null for missing values.`,

  water_bill: `Extract these fields as JSON:
supplier_name, billing_period, consumption_volume (number), unit, total_amount (number). Use null for missing values.`,

  gas_bill: `Extract these fields as JSON:
supplier_name, billing_period, consumption_volume (number), unit (SCM or cubic metres), total_amount (number). Use null for missing values.`,

  lpg_bill: `Extract these fields as JSON:
supplier_name, billing_period, quantity_kg (number), unit, rate_per_kg (number), total_amount (number). Use null for missing values.`,

  steam_bill: `Extract these fields as JSON:
supplier_name, billing_period, steam_quantity_tonnes (number), unit, pressure_bar, total_amount (number). Use null for missing values.`,

  renewable_energy_certificate: `Extract these fields as JSON:
issuer_name, certificate_number, issue_date (YYYY-MM-DD), energy_mwh (number),
technology_type (solar/wind/hydro), validity_period, total_amount (number). Use null for missing values.`,

  fuel_transport_invoice: `Extract these fields as JSON:
transporter_name, invoice_number, invoice_date (YYYY-MM-DD), fuel_type,
quantity_litres (number), origin, destination, freight_charges (number), total_amount (number). Use null for missing values.`,
};

const parseJsonResponse = (content) => {
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return {};
  }

  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    return {};
  }
};

const normalizeDocumentType = (rawType) => {
  const cleaned = rawType.toLowerCase().replace(/[^a-z_]/g, "");
  const match = DOCUMENT_TYPES.find((type) => cleaned.includes(type.replace(/_/g, "")) || cleaned === type);
  if (match) return match;

  if (cleaned.includes("electric")) return "electricity_bill";
  if (cleaned.includes("diesel")) return "diesel_invoice";
  if (cleaned.includes("coal")) return "coal_invoice";
  if (cleaned.includes("water")) return "water_bill";
  if (cleaned.includes("lpg")) return "lpg_bill";
  if (cleaned.includes("steam")) return "steam_bill";
  if (cleaned.includes("renewable") || cleaned.includes("rec")) {
    return "renewable_energy_certificate";
  }
  if (cleaned.includes("transport") || cleaned.includes("freight")) {
    return "fuel_transport_invoice";
  }
  if (cleaned.includes("gas")) return "gas_bill";

  return DOCUMENT_TYPES.includes(cleaned) ? cleaned : "electricity_bill";
};

const classifyDocument = async (text) => {
  const response = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "system",
        content: `You are a document classifier for Indian utility bills and invoices. Return ONLY one value from: ${DOCUMENT_TYPES.join(", ")}.`,
      },
      {
        role: "user",
        content: text.slice(0, 8000),
      },
    ],
    temperature: 0,
  });

  return normalizeDocumentType(response.choices[0].message.content.trim());
};

const detectVendor = async (text) => {
  const response = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "system",
        content:
          "Identify the utility provider, supplier, issuer, or transporter from this Indian document. Return ONLY the company name (e.g. Tata Power, IOCL, BSES, HP Gas).",
      },
      {
        role: "user",
        content: text.slice(0, 8000),
      },
    ],
    temperature: 0,
  });

  return response.choices[0].message.content.trim();
};

const extractFields = async (text, documentType) => {
  const prompt =
    FIELD_PROMPTS[documentType] || FIELD_PROMPTS.electricity_bill;

  const response = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "system",
        content: `You extract structured data from utility documents. ${prompt} Return valid JSON only.`,
      },
      {
        role: "user",
        content: text.slice(0, 12000),
      },
    ],
    temperature: 0,
  });

  return parseJsonResponse(response.choices[0].message.content);
};

const scoreConfidence = (fields, warnings) => {
  const values = Object.values(fields).filter(
    (v) => v !== null && v !== undefined && v !== ""
  );
  const fillRate = values.length / Math.max(Object.keys(fields).length, 1);
  const penalty = warnings.length * 0.05;

  return Math.max(0, Math.min(1, Number((fillRate - penalty).toFixed(2))));
};

const runAgenticPipeline = async (text, existingDocuments = []) => {
  const documentType = await classifyDocument(text);
  const vendor = await detectVendor(text);
  const fields = await extractFields(text, documentType);

  const extractedData = {
    document_type: documentType,
    vendor,
    ...fields,
    bill_date:
      fields.bill_date || fields.invoice_date || fields.issue_date || null,
    billing_period: fields.billing_period || null,
    total_amount: fields.total_amount ?? null,
  };

  if (documentType === "electricity_bill") {
    extractedData.consumption_kwh = fields.units_consumed_kwh ?? null;
  }

  const validationWarnings = validateExtraction(
    extractedData,
    existingDocuments
  );

  extractedData.confidence_score = scoreConfidence(fields, validationWarnings);

  return { extractedData, validationWarnings };
};

module.exports = {
  classifyDocument,
  detectVendor,
  extractFields,
  runAgenticPipeline,
  DOCUMENT_TYPES,
};
