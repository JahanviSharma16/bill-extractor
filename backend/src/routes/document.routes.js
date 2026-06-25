const express = require("express");
const upload = require("../middleware/upload");
const { authenticate } = require("../middleware/auth");
const {
  uploadDocuments,
  getDocuments,
  getDocumentById,
  getDocumentFile,
  updateDocument,
  approveDocument,
} = require("../controllers/document.controller");

const router = express.Router();

router.use(authenticate);

router.post(
  "/upload",
  upload.fields([
    { name: "document", maxCount: 1 },
    { name: "documents", maxCount: 10 },
  ]),
  (req, res, next) => {
    const single = req.files?.document || [];
    const multiple = req.files?.documents || [];
    req.files = [...single, ...multiple];
    next();
  },
  uploadDocuments
);

router.get("/", getDocuments);
router.get("/:id/file", getDocumentFile);
router.get("/:id", getDocumentById);
router.patch("/:id", updateDocument);
router.post("/:id/approve", approveDocument);

module.exports = router;
