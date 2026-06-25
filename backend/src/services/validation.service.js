const REQUIRED_FIELDS = {
  electricity_bill: [
    "utility_provider",
    "consumer_number",
    "account_number",
    "billing_period",
    "bill_date",
    "due_date",
    "units_consumed_kwh",
    "total_amount",
  ],
  diesel_invoice: [
    "supplier_name",
    "invoice_number",
    "invoice_date",
    "quantity_litres",
    "total_amount",
  ],
  coal_invoice: [
    "supplier_name",
    "invoice_number",
    "invoice_date",
    "coal_grade",
    "quantity_tonnes",
    "total_amount",
  ],
  water_bill: [
    "supplier_name",
    "billing_period",
    "consumption_volume",
    "total_amount",
  ],
  gas_bill: [
    "supplier_name",
    "billing_period",
    "consumption_volume",
    "total_amount",
  ],
  lpg_bill: [
    "supplier_name",
    "billing_period",
    "quantity_kg",
    "total_amount",
  ],
  steam_bill: [
    "supplier_name",
    "billing_period",
    "steam_quantity_tonnes",
    "total_amount",
  ],
  renewable_energy_certificate: [
    "issuer_name",
    "certificate_number",
    "issue_date",
    "energy_mwh",
    "total_amount",
  ],
  fuel_transport_invoice: [
    "transporter_name",
    "invoice_number",
    "invoice_date",
    "fuel_type",
    "quantity_litres",
    "total_amount",
  ],
};

const CONSUMPTION_FIELDS = [
  "units_consumed_kwh",
  "quantity_litres",
  "quantity_tonnes",
  "consumption_volume",
  "quantity_kg",
  "steam_quantity_tonnes",
  "energy_mwh",
];

const EXPECTED_UNITS = {
  electricity_bill: { units_consumed_kwh: ["kwh", "kw h", "units"] },
  diesel_invoice: { quantity_litres: ["litres", "liters", "ltr", "l"] },
  coal_invoice: { quantity_tonnes: ["tonnes", "tons", "mt"] },
  water_bill: { consumption_volume: ["kl", "kilolitres", "cubic metres", "m3", "litres"] },
  gas_bill: { consumption_volume: ["scm", "cubic metres", "m3", "kg"] },
  lpg_bill: { quantity_kg: ["kg", "kilograms", "cylinders"] },
  steam_bill: { steam_quantity_tonnes: ["tonnes", "tons", "mt", "kg"] },
  renewable_energy_certificate: { energy_mwh: ["mwh", "mw h", "kwh"] },
  fuel_transport_invoice: { quantity_litres: ["litres", "liters", "ltr", "l"] },
};

const normalizeUnit = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const validateUnits = (extractedData, warnings) => {
  const documentType = extractedData.document_type;
  const unitRules = EXPECTED_UNITS[documentType];
  if (!unitRules) return;

  const unitField = extractedData.unit;

  for (const [field, allowedUnits] of Object.entries(unitRules)) {
    const value = extractedData[field];
    if (value === null || value === undefined || value === "") continue;

    if (unitField) {
      const normalized = normalizeUnit(unitField);
      const isValid = allowedUnits.some(
        (unit) => normalized.includes(normalizeUnit(unit))
      );

      if (!isValid) {
        warnings.push(
          `Incorrect unit for ${documentType}: expected one of [${allowedUnits.join(", ")}], got "${unitField}"`
        );
      }
    }
  }
};

const validateExtraction = (extractedData, existingDocuments = []) => {
  const warnings = [];
  const documentType = extractedData.document_type;
  const required = REQUIRED_FIELDS[documentType] || [];

  for (const field of required) {
    const value = extractedData[field];
    if (value === null || value === undefined || value === "") {
      warnings.push(`Missing required field: ${field}`);
    }
  }

  for (const field of CONSUMPTION_FIELDS) {
    const value = extractedData[field];
    if (value !== null && value !== undefined && Number(value) < 0) {
      warnings.push(`Suspicious value: ${field} is negative (${value})`);
    }
  }

  if (
    extractedData.total_amount !== null &&
    extractedData.total_amount !== undefined &&
    Number(extractedData.total_amount) < 0
  ) {
    warnings.push("Suspicious value: total_amount is negative");
  }

  if (!extractedData.bill_date && !extractedData.invoice_date && !extractedData.issue_date) {
    warnings.push("Missing invoice or bill date");
  }

  validateUnits(extractedData, warnings);

  const invoiceNumber =
    extractedData.invoice_number ||
    extractedData.account_number ||
    extractedData.certificate_number;
  const vendor =
    extractedData.vendor ||
    extractedData.supplier_name ||
    extractedData.issuer_name ||
    extractedData.transporter_name;

  if (invoiceNumber && vendor) {
    const duplicate = existingDocuments.find((doc) => {
      const data = doc.extractedData || doc.correctedData || {};
      const existingInvoice =
        data.invoice_number ||
        data.account_number ||
        data.certificate_number;
      const existingVendor =
        data.vendor ||
        data.supplier_name ||
        data.issuer_name ||
        data.transporter_name;

      return (
        existingInvoice === invoiceNumber && existingVendor === vendor
      );
    });

    if (duplicate) {
      warnings.push(
        `Possible duplicate invoice: ${invoiceNumber} from ${vendor}`
      );
    }
  }

  return warnings;
};

module.exports = {
  validateExtraction,
  REQUIRED_FIELDS,
  EXPECTED_UNITS,
};
