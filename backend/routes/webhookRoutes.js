const express = require("express");
const router = express.Router();
const {
  handleRazorpayWebhook,
  handleDeltaWebhook,
  getWebhookLogs,
} = require("../controllers/webhookController");
const { protect, authorize } = require("../middleware/auth");

// @route   POST /api/webhooks/razorpay
// @desc    Handle Razorpay webhook
// @access  Public (webhook)
router.post("/razorpay", express.raw({ type: "application/json" }), handleRazorpayWebhook);

// @route   POST /api/webhooks/delta
// @desc    Handle Delta Exchange webhook
// @access  Public (webhook)
router.post("/delta", express.raw({ type: "application/json" }), handleDeltaWebhook);

// @route   GET /api/webhooks/logs
// @desc    Get webhook logs (admin only)
// @access  Private/Admin
router.get("/logs", protect, authorize("admin"), getWebhookLogs);

module.exports = router;


