const express = require("express");
const { authenticate, authorize } = require("../middleware/auth");
const {
  listUsers,
  updateUserRole,
  deleteUser,
} = require("../controllers/user.controller");

const router = express.Router();

router.use(authenticate, authorize("admin"));

router.get("/", listUsers);
router.patch("/:id/role", updateUserRole);
router.delete("/:id", deleteUser);

module.exports = router;
