const crypto = require("crypto");
const User = require("../models/User");
const WebhookLog = require("../models/WebhookLog");
const SystemLog = require("../models/SystemLog");
const { processWebhookSignal } = require("../services/tradingService");

// @desc    Handle TradingView webhook
// @route   POST /api/webhook/tradingview
// @access  Public (with token authentication)
const handleTradingViewWebhook = async (req, res, next) => {
  try {
    const { token, signal } = req.body;

    if (!token || !signal) {
      return res.status(400).json({
        success: false,
        message: "Token and signal are required",
      });
    }

    // Find user by webhook token
    const user = await User.findOne({ webhookToken: token });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid webhook token",
      });
    }

    // Check if user is active and approved
    if (!user.isActive || !user.isApproved) {
      return res.status(403).json({
        success: false,
        message: "User account not active",
      });
    }

    // Check if trading is enabled
    if (!user.tradingActive) {
      return res.status(403).json({
        success: false,
        message: "Trading is not active for this user",
      });
    }

    // Log webhook
    const webhookLog = await WebhookLog.create({
      userId: user._id,
      source: "tradingview",
      signal,
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
      headers: req.headers,
    });

    // Process signal asynchronously
    processWebhookSignal(user, signal, webhookLog._id).catch((error) => {
      console.error("Webhook signal processing error:", error);
      WebhookLog.findByIdAndUpdate(webhookLog._id, {
        processingError: error.message,
      });
    });

    res.status(200).json({
      success: true,
      message: "Webhook received and queued for processing",
      webhookId: webhookLog._id,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Handle generic webhook
// @route   POST /api/webhook/generic
// @access  Public (with token authentication)
const handleGenericWebhook = async (req, res, next) => {
  try {
    const { token } = req.query;
    const signal = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Token is required",
      });
    }

    // Find user by webhook token
    const user = await User.findOne({ webhookToken: token });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid webhook token",
      });
    }

    // Check if user is active and approved
    if (!user.isActive || !user.isApproved) {
      return res.status(403).json({
        success: false,
        message: "User account not active",
      });
    }

    // Log webhook
    const webhookLog = await WebhookLog.create({
      userId: user._id,
      source: "generic",
      signal,
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
      headers: req.headers,
    });

    // Process signal if trading is active
    if (user.tradingActive) {
      processWebhookSignal(user, signal, webhookLog._id).catch((error) => {
        console.error("Webhook signal processing error:", error);
        WebhookLog.findByIdAndUpdate(webhookLog._id, {
          processingError: error.message,
        });
      });
    }

    res.status(200).json({
      success: true,
      message: "Webhook received",
      webhookId: webhookLog._id,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Handle Razorpay webhook
// @route   POST /api/webhook/razorpay
// @access  Public (with signature verification)
const handleRazorpayWebhook = async (req, res, next) => {
  try {
    const signature = req.get("X-Razorpay-Signature");
    const body = JSON.stringify(req.body);

    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(body)
      .digest("hex");

    if (signature !== expectedSignature) {
      return res.status(400).json({
        success: false,
        message: "Invalid webhook signature",
      });
    }

    const { event, payload } = req.body;

    // Log webhook
    await SystemLog.log("info", `Razorpay webhook: ${event}`, "webhook", {
      event,
      paymentId: payload.payment?.entity?.id,
      orderId: payload.payment?.entity?.order_id,
    });

    // Handle different events
    switch (event) {
      case "payment.captured":
        await handlePaymentCaptured(payload.payment.entity);
        break;

      case "payment.failed":
        await handlePaymentFailed(payload.payment.entity);
        break;

      case "subscription.cancelled":
        await handleSubscriptionCancelled(payload.subscription.entity);
        break;

      default:
        console.log(`Unhandled Razorpay event: ${event}`);
    }

    res.status(200).json({
      success: true,
      message: "Webhook processed",
    });
  } catch (error) {
    next(error);
  }
};

// Handle payment captured event
const handlePaymentCaptured = async (payment) => {
  try {
    const Payment = require("../models/Payment");

    const paymentRecord = await Payment.findOne({
      razorpayPaymentId: payment.id,
    });

    if (paymentRecord && paymentRecord.status !== "paid") {
      paymentRecord.status = "paid";
      await paymentRecord.save();

      await SystemLog.log("info", "Payment captured via webhook", "payment", {
        paymentId: payment.id,
        orderId: payment.order_id,
        amount: payment.amount / 100,
      });
    }
  } catch (error) {
    console.error("Handle payment captured error:", error);
  }
};

// Handle payment failed event
const handlePaymentFailed = async (payment) => {
  try {
    const Payment = require("../models/Payment");

    const paymentRecord = await Payment.findOne({
      razorpayOrderId: payment.order_id,
    });

    if (paymentRecord) {
      paymentRecord.status = "failed";
      await paymentRecord.save();

      await SystemLog.log("warning", "Payment failed via webhook", "payment", {
        paymentId: payment.id,
        orderId: payment.order_id,
        errorCode: payment.error_code,
        errorDescription: payment.error_description,
      });
    }
  } catch (error) {
    console.error("Handle payment failed error:", error);
  }
};

// Handle subscription cancelled event
const handleSubscriptionCancelled = async (subscription) => {
  try {
    // Handle subscription cancellation logic here
    await SystemLog.log("info", "Subscription cancelled via webhook", "payment", {
      subscriptionId: subscription.id,
      customerId: subscription.customer_id,
    });
  } catch (error) {
    console.error("Handle subscription cancelled error:", error);
  }
};

// @desc    Handle Delta Exchange webhook
// @route   POST /api/webhook/delta
// @access  Public (with signature verification)
const handleDeltaWebhook = async (req, res, next) => {
  try {
    const signature = req.get("X-Delta-Signature");
    const body = JSON.stringify(req.body);

    // Verify webhook signature (example - replace with actual Delta logic)
    const expectedSignature = crypto
      .createHmac("sha256", process.env.DELTA_WEBHOOK_SECRET)
      .update(body)
      .digest("hex");

    if (signature !== expectedSignature) {
      return res.status(400).json({
        success: false,
        message: "Invalid Delta webhook signature",
      });
    }

    const { event, data } = req.body;

    // Log webhook
    await SystemLog.log("info", `Delta webhook: ${event}`, "webhook", {
      event,
      data,
    });

    // Process Delta specific events (e.g., order updates, trade fills)
    switch (event) {
      case "order_filled":
        // Handle order filled event
        break;
      case "trade_executed":
        // Handle trade executed event
        break;
      default:
        console.log(`Unhandled Delta event: ${event}`);
    }

    res.status(200).json({
      success: true,
      message: "Delta webhook processed",
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user webhook token
// @route   GET /api/webhook/token
// @access  Private
const getWebhookToken = async (req, res, next) => {
  try {
    let user = await User.findById(req.user.id);

    // Generate webhook token if not exists
    if (!user.webhookToken) {
      user.webhookToken = crypto.randomBytes(32).toString("hex");
      await user.save();
    }

    res.status(200).json({
      success: true,
      data: {
        webhookToken: user.webhookToken,
        webhookUrls: {
          tradingview: `${req.protocol}://${req.get(
            "host"
          )}/api/webhook/tradingview`,
          generic: `${req.protocol}://${req.get(
            "host"
          )}/api/webhook/generic?token=${user.webhookToken}`,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Regenerate webhook token
// @route   POST /api/webhook/regenerate-token
// @access  Private
const regenerateWebhookToken = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    user.webhookToken = crypto.randomBytes(32).toString("hex");
    await user.save();

    // Log token regeneration
    await SystemLog.log("info", "Webhook token regenerated", "webhook", {
      userId: req.user.id,
    });

    res.status(200).json({
      success: true,
      message: "Webhook token regenerated successfully",
      data: {
        webhookToken: user.webhookToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all webhook logs (admin only)
// @route   GET /api/webhooks/logs
// @access  Private/Admin
const getWebhookLogs = async (req, res, next) => {
  try {
    const logs = await WebhookLog.find().sort({ createdAt: -1 }).limit(100);
    res.status(200).json({
      success: true,
      data: logs,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  handleTradingViewWebhook,
  handleGenericWebhook,
  handleRazorpayWebhook,
  handleDeltaWebhook,
  getWebhookToken,
  regenerateWebhookToken,
  getWebhookLogs,
};


