const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    originalName: {
      type: String,
      required: true,
    },
    fileName: {
      type: String,
      required: true,
    },
    filePath: {
      type: String,
      required: true,
    },
    fileData: {
      type: Buffer,
      select: false,
    },
    mimeType: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["uploaded", "processing", "processed", "approved", "failed"],
      default: "uploaded",
    },
    processingStage: {
      type: String,
      enum: [
        "queued",
        "ocr",
        "classification",
        "extraction",
        "validation",
        "completed",
        "failed",
      ],
      default: "queued",
    },
    processingProgress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    ocrMethod: {
      type: String,
      default: "",
    },
    ocrText: {
      type: String,
      default: "",
    },
    extractedData: {
      type: Object,
      default: {},
    },
    correctedData: {
      type: Object,
      default: null,
    },
    validationWarnings: {
      type: [String],
      default: [],
    },
    approvalStatus: {
      type: Boolean,
      default: false,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    errorMessage: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Document", documentSchema);
