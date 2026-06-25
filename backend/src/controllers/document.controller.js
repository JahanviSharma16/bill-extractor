const fs = require("fs");
const path = require("path");
const Document = require("../models/Document");
const billQueue = require("../queue/bill.queue");
const { validateExtraction } = require("../services/validation.service");

const createDocumentRecord = async (file, userId) => {
  const fileData = fs.readFileSync(file.path);

  const document = await Document.create({
    userId,
    originalName: file.originalname,
    fileName: file.filename,
    filePath: file.path,
    fileData,
    mimeType: file.mimetype,
    processingStage: "queued",
    processingProgress: 0,
  });

  await billQueue.add("process-bill", {
    documentId: document._id.toString(),
  });

  const safeDocument = document.toObject();
  delete safeDocument.fileData;

  return safeDocument;
};

const uploadDocuments = async (req, res) => {
  try {
    const files = req.files?.length ? req.files : req.file ? [req.file] : [];

    if (!files.length) {
      return res.status(400).json({
        success: false,
        message: "No files uploaded",
      });
    }

    const documents = await Promise.all(
      files.map((file) => createDocumentRecord(file, req.user._id))
    );

    return res.status(201).json({
      success: true,
      message: `${documents.length} document(s) queued for processing`,
      documents,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getDocuments = async (req, res) => {
  try {
    const filter =
      req.user.role === "admin" ? {} : { userId: req.user._id };

    const documents = await Document.find(filter)
      .select("-fileData")
      .sort({ createdAt: -1 })
      .populate("userId", "name email");

    return res.json({
      success: true,
      documents,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getDocumentById = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id)
      .select("-fileData")
      .populate("userId", "name email");

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found",
      });
    }

    if (
      req.user.role !== "admin" &&
      document.userId._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    return res.json({
      success: true,
      document,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getDocumentOwnerId = (document) => {
  const owner = document.userId?._id || document.userId;
  return owner?.toString();
};

const getDocumentFile = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id).select(
      "+fileData userId filePath mimeType originalName"
    );

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found",
      });
    }

    const ownerId = getDocumentOwnerId(document);

    if (req.user.role !== "admin" && ownerId !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    if (document.fileData?.length > 0) {
      res.setHeader("Content-Type", document.mimeType);
      res.setHeader(
        "Content-Disposition",
        `inline; filename="${document.originalName}"`
      );
      return res.send(document.fileData);
    }

    const absolutePath = path.isAbsolute(document.filePath)
      ? document.filePath
      : path.resolve(process.cwd(), document.filePath);

    if (fs.existsSync(absolutePath)) {
      res.setHeader("Content-Type", document.mimeType);
      res.setHeader(
        "Content-Disposition",
        `inline; filename="${document.originalName}"`
      );
      return res.sendFile(absolutePath);
    }

    return res.status(404).json({
      success: false,
      message: "File not found",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const updateDocument = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found",
      });
    }

    if (
      req.user.role !== "admin" &&
      document.userId.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const { correctedData } = req.body;

    const existingDocuments = await Document.find({
      _id: { $ne: document._id },
      status: { $in: ["processed", "approved"] },
    })
      .select("extractedData correctedData")
      .limit(100);

    const validationWarnings = validateExtraction(
      correctedData,
      existingDocuments
    );

    document.correctedData = correctedData;
    document.validationWarnings = validationWarnings;
    await document.save();

    const safeDocument = document.toObject();
    delete safeDocument.fileData;

    return res.json({
      success: true,
      message: "Corrections saved",
      document: safeDocument,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const approveDocument = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found",
      });
    }

    if (
      req.user.role !== "admin" &&
      document.userId.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const finalData =
      req.body.finalData ||
      document.correctedData ||
      document.extractedData;

    const existingDocuments = await Document.find({
      _id: { $ne: document._id },
      status: { $in: ["processed", "approved"] },
    })
      .select("extractedData correctedData")
      .limit(100);

    const validationWarnings = validateExtraction(
      finalData,
      existingDocuments
    );

    document.correctedData = finalData;
    document.validationWarnings = validationWarnings;
    document.approvalStatus = true;
    document.status = "approved";
    document.approvedAt = new Date();
    await document.save();

    const safeDocument = document.toObject();
    delete safeDocument.fileData;

    return res.json({
      success: true,
      message: "Document approved",
      document: safeDocument,
      validationWarnings,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  uploadDocuments,
  getDocuments,
  getDocumentById,
  getDocumentFile,
  updateDocument,
  approveDocument,
};
