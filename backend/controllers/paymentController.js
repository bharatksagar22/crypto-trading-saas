const Payment = require("../models/Payment");
const User = require("../models/User");
const Coupon = require("../models/Coupon");
const SystemLog = require("../models/SystemLog");
const {
  createSubscriptionOrder,
  verifyPaymentSignature,
  getPaymentDetails,
  PLAN_PRICING,
} = require("../services/razorpayService");
const { sendPaymentConfirmation } = require("../utils/email");

// @desc    Get plan pricing
// @route   GET /api/payment/plans
// @access  Public
const getPlanPricing = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      data: {
        plans: PLAN_PRICING,
        features: {
          basic: [
            "AI Trading Bot",
            "Basic Strategies (5)",
            "Email Support",
            "Daily Reports",
            "Paper Trading",
          ],
          pro: [
            "All Basic Features",
            "Advanced Strategies (12)",
            "Real-time Alerts",
            "Priority Support",
            "Advanced Analytics",
            "Custom Risk Settings",
          ],
          elite: [
            "All Pro Features",
            "All Strategies (18)",
            "Dedicated Support",
            "Custom Strategies",
            "API Access",
            "White-label Options",
          ],
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create payment order
// @route   POST /api/payment/create-order
// @access  Private
const createPaymentOrder = async (req, res, next) => {
  try {
    const { planType, duration, couponCode } = req.body;

    // Validate plan and duration
    if (!PLAN_PRICING[planType] || !PLAN_PRICING[planType][duration]) {
      return res.status(400).json({
        success: false,
        message: "Invalid plan type or duration",
      });
    }

    // Get user's referral code (for new subscriptions)
    const user = await User.findById(req.user.id);
    const referralCode = user.referredBy;

    // Create subscription order
    const { order, pricing, coupon } = await createSubscriptionOrder(
      req.user.id,
      planType,
      duration,
      couponCode,
      referralCode
    );

    // Create payment record
    const payment = await Payment.create({
      userId: req.user.id,
      razorpayOrderId: order.id,
      amount: pricing.baseAmount,
      planType,
      planDuration: duration,
      couponCode: coupon?.code || "",
      discountPercent: pricing.couponDiscount,
      referralDiscount: pricing.referralDiscount,
      finalAmount: pricing.finalAmount,
      status: "created",
    });

    // Use coupon if provided
    if (coupon) {
      await coupon.useCoupon(req.user.id);
    }

    // Log order creation
    await SystemLog.log("info", "Payment order created", "payment", {
      userId: req.user.id,
      orderId: order.id,
      planType,
      duration,
      amount: pricing.finalAmount,
    });

    res.status(201).json({
      success: true,
      data: {
        order,
        pricing,
        payment: {
          id: payment._id,
          planType,
          duration,
          finalAmount: pricing.finalAmount,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify payment
// @route   POST /api/payment/verify
// @access  Private
const verifyPayment = async (req, res, next) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    // Verify signature
    const isValidSignature = verifyPaymentSignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    if (!isValidSignature) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment signature",
      });
    }

    // Find payment record
    const payment = await Payment.findOne({
      razorpayOrderId: razorpay_order_id,
      userId: req.user.id,
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment record not found",
      });
    }

    // Get payment details from Razorpay
    const paymentDetails = await getPaymentDetails(razorpay_payment_id);

    // Update payment record
    payment.razorpayPaymentId = razorpay_payment_id;
    payment.status = "paid";
    payment.paymentMethod = paymentDetails.method;
    await payment.save();

    // Update user subscription (handled by Payment model post-save hook)
    const user = await User.findById(req.user.id);

    // Handle referral bonus
    if (user.referredBy) {
      const referrer = await User.findOne({ referralCode: user.referredBy });
      if (referrer) {
        const bonusAmount = Math.round(payment.finalAmount * 0.1); // 10% bonus
        referrer.referralEarnings += bonusAmount;
        referrer.walletBalance += bonusAmount;
        await referrer.save();

        // Log referral bonus
        await SystemLog.log("info", "Referral bonus credited", "payment", {
          referrerId: referrer._id,
          userId: user._id,
          bonusAmount,
          paymentId: payment._id,
        });
      }
    }

    // Send confirmation email
    try {
      await sendPaymentConfirmation(user, payment);
    } catch (emailError) {
      console.error("Payment confirmation email error:", emailError);
    }

    // Log successful payment
    await SystemLog.log("info", "Payment verified successfully", "payment", {
      userId: req.user.id,
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
      amount: payment.finalAmount,
    });

    res.status(200).json({
      success: true,
      message: "Payment verified successfully",
      data: {
        payment: {
          id: payment._id,
          status: payment.status,
          planType: payment.planType,
          duration: payment.planDuration,
          amount: payment.finalAmount,
        },
        subscription: {
          plan: user.subscriptionPlan,
          status: user.subscriptionStatus,
          endDate: user.subscriptionEndDate,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user payment history
// @route   GET /api/payment/history
// @access  Private
const getPaymentHistory = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const payments = await Payment.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Payment.countDocuments({ userId: req.user.id });

    res.status(200).json({
      success: true,
      data: {
        payments,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Apply coupon
// @route   POST /api/payment/apply-coupon
// @access  Private
const applyCoupon = async (req, res, next) => {
  try {
    const { couponCode, planType } = req.body;

    const coupon = await Coupon.findOne({ code: couponCode.toUpperCase() });

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Coupon not found",
      });
    }

    const validation = coupon.isValid(req.user.id);

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.message,
      });
    }

    // Calculate discounted amount (example logic)
    const basePrice = PLAN_PRICING[planType]?.monthly?.price || 0;
    let discountedAmount = basePrice;

    if (coupon.discountType === "percentage") {
      discountedAmount = basePrice * (1 - coupon.discountValue / 100);
    } else if (coupon.discountType === "fixed") {
      discountedAmount = basePrice - coupon.discountValue;
    }

    res.status(200).json({
      success: true,
      data: {
        coupon: {
          code: coupon.code,
          discountType: coupon.discountType,
          discountValue: coupon.discountValue,
        },
        originalAmount: basePrice,
        discountedAmount: Math.max(0, discountedAmount), // Ensure not negative
        message: `Coupon applied! You save ${basePrice - Math.max(0, discountedAmount)}`,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Validate coupon
// @route   POST /api/payment/validate-coupon
// @access  Private
const validateCoupon = async (req, res, next) => {
  try {
    const { couponCode } = req.body;

    const coupon = await Coupon.findOne({
      code: couponCode.toUpperCase(),
    });

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Coupon not found",
      });
    }

    const validation = coupon.isValid(req.user.id);

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.message,
      });
    }

    res.status(200).json({
      success: true,
      data: {
        coupon: {
          code: coupon.code,
          discountPercent: coupon.discountPercent,
          validTo: coupon.validTo,
        },
        message: `${coupon.discountPercent}% discount will be applied`,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel subscription
// @route   POST /api/payment/cancel-subscription
// @access  Private
const cancelSubscription = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    if (user.subscriptionStatus !== "active") {
      return res.status(400).json({
        success: false,
        message: "No active subscription to cancel",
      });
    }

    // Update subscription status
    user.subscriptionStatus = "inactive";
    user.autoRenewal = false;
    user.tradingActive = false; // Stop trading
    await user.save();

    // Log cancellation
    await SystemLog.log("info", "Subscription cancelled", "payment", {
      userId: req.user.id,
      previousPlan: user.subscriptionPlan,
    });

    res.status(200).json({
      success: true,
      message: "Subscription cancelled successfully",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPlanPricing,
  createPaymentOrder,
  verifyPayment,
  getPaymentHistory,
  applyCoupon,
  validateCoupon,
  cancelSubscription,
};


