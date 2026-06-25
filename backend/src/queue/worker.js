const fs = require("fs");
const { Worker } = require("bullmq");
const Document = require("../models/Document");
const { processDocument } = require("../services/ocr.service");
const { runAgenticPipeline } = require("../services/extraction.service");

const updateProgress = async (documentId, stage, progress) => {
  await Document.findByIdAndUpdate(documentId, {
    processingStage: stage,
    processingProgress: progress,
    status: "processing",
  });
};

const worker = new Worker(
  "bill-processing",
  async (job) => {
    const { documentId } = job.data;

    try {
      console.log(`Processing document ${documentId}`);
      await updateProgress(documentId, "queued", 5);

      const document = await Document.findById(documentId);
      if (!document) {
        throw new Error("Document not found");
      }

      await updateProgress(documentId, "ocr", 20);
      const { text, ocrMethod } = await processDocument(
        document.filePath,
        document.mimeType
      );

      await Document.findByIdAndUpdate(documentId, {
        ocrText: text,
        ocrMethod,
        processingStage: "classification",
        processingProgress: 45,
      });

      const existingDocuments = await Document.find({
        _id: { $ne: documentId },
        status: { $in: ["processed", "approved"] },
      })
        .select("extractedData correctedData")
        .limit(100);

      await updateProgress(documentId, "extraction", 65);
      const { extractedData, validationWarnings } = await runAgenticPipeline(
        text,
        existingDocuments
      );

      await Document.findByIdAndUpdate(documentId, {
        extractedData,
        validationWarnings,
        status: "processed",
        processingStage: "completed",
        processingProgress: 100,
        errorMessage: "",
      });

      console.log(`Document ${documentId} processed successfully`);
    } catch (error) {
      console.error(`Document ${documentId} failed:`, error.message);

      await Document.findByIdAndUpdate(documentId, {
        status: "failed",
        processingStage: "failed",
        processingProgress: 0,
        errorMessage: error.message,
      });

      throw error;
    }
  },
  {
    connection: {
      host: process.env.REDIS_HOST,
      port: Number(process.env.REDIS_PORT),
    },
  }
);

worker.on("completed", (job) => {
  console.log(`Job ${job.id} completed`);
});

worker.on("failed", (job, error) => {
  console.error(`Job ${job?.id} failed:`, error.message);
});

module.exports = worker;
