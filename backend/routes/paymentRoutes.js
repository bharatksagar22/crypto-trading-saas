const express = require("express");
const router = express.Router();
const {
  createPaymentOrder,
  verifyPayment,
  getPaymentHistory,
  applyCoupon,
  validateCoupon,
} = require("../controllers/paymentController");
const { protect } = require("../middleware/auth");

// @route   POST /api/payments/create-order
// @desc    Create Razorpay order
// @access  Private
router.post("/create-order", protect, createPaymentOrder);

// @route   POST /api/payments/verify
// @desc    Verify payment
// @access  Private
router.post("/verify", protect, verifyPayment);

// @route   GET /api/payments/history
// @desc    Get payment history
// @access  Private
router.get("/history", protect, getPaymentHistory);

// @route   POST /api/payments/apply-coupon
// @desc    Apply coupon code
// @access  Private
router.post("/apply-coupon", protect, applyCoupon);

// @route   POST /api/payments/validate-coupon
// @desc    Validate coupon code
// @access  Private
router.post("/validate-coupon", protect, validateCoupon);

module.exports = router;


