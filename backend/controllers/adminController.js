const User = require("../models/User");
const Trade = require("../models/Trade");
const Payment = require("../models/Payment");
const Coupon = require("../models/Coupon");
const WebhookLog = require("../models/WebhookLog");
const SystemLog = require("../models/SystemLog");
const { sendApprovalEmail } = require("../utils/email");

// @desc    Get admin dashboard
// @route   GET /api/admin/dashboard
// @access  Private/Admin
const getDashboard = async (req, res, next) => {
  try {
    // Get user stats
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const pendingApprovals = await User.countDocuments({ isApproved: false });

    // Get trading stats
    const totalTrades = await Trade.countDocuments();
    const todayTrades = await Trade.countDocuments({
      createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
    });

    // Get revenue stats
    const totalRevenue = await Payment.aggregate([
      { $match: { status: "paid" } },
      { $group: { _id: null, total: { $sum: "$finalAmount" } } },
    ]);

    // Get recent activities
    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select("name email createdAt isApproved");

    const recentTrades = await Trade.find()
      .populate("userId", "name email")
      .sort({ createdAt: -1 })
      .limit(10);

    res.status(200).json({
      success: true,
      data: {
        stats: {
          totalUsers,
          activeUsers,
          pendingApprovals,
          totalTrades,
          todayTrades,
          totalRevenue: totalRevenue[0]?.total || 0,
        },
        recentUsers,
        recentTrades,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private/Admin
const getAllUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const { search, status, plan } = req.query;

    // Build filter
    const filter = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }
    if (status) filter.subscriptionStatus = status;
    if (plan) filter.subscriptionPlan = plan;

    const users = await User.find(filter)
      .select("-password -deltaApiKey -deltaApiSecret")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: {
        users,
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

// @desc    Update user
// @route   PUT /api/admin/users/:id
// @access  Private/Admin
const updateUser = async (req, res, next) => {
  try {
    const { isApproved } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isApproved, isActive: isApproved },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Send approval email
    if (isApproved) {
      try {
        await sendApprovalEmail(user);
      } catch (emailError) {
        console.error("Approval email error:", emailError);
      }
    }

    // Log approval action
    await SystemLog.log("info", `User ${isApproved ? "approved" : "rejected"}`, "admin", {
      targetUserId: user._id,
      adminId: req.user.id,
      action: isApproved ? "approve" : "reject",
    });

    res.status(200).json({
      success: true,
      message: `User ${isApproved ? "approved" : "rejected"} successfully`,
      user: user.getPublicProfile(),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete user
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    await SystemLog.log("info", `User deleted: ${user.email}`, "admin", {
      targetUserId: user._id,
      adminId: req.user.id,
    });

    res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle user trading status
// @route   POST /api/admin/users/:id/toggle-trading
// @access  Private/Admin
const toggleUserTrading = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    user.tradingActive = !user.tradingActive;
    await user.save();

    await SystemLog.log(
      "info",
      `User trading toggled: ${user.email} to ${user.tradingActive}`,
      "admin",
      {
        targetUserId: user._id,
        adminId: req.user.id,
      }
    );

    res.status(200).json({
      success: true,
      message: "User trading status toggled successfully",
      tradingActive: user.tradingActive,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get system logs
// @route   GET /api/admin/logs
// @access  Private/Admin
const getSystemLogs = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const { level, module } = req.query;
    const filter = {};
    if (level) filter.level = level;
    if (module) filter.module = module;

    const logs = await SystemLog.find(filter)
      .populate("userId", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await SystemLog.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: {
        logs,
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

// @desc    Get system stats
// @route   GET /api/admin/stats
// @access  Private/Admin
const getSystemStats = async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const totalTrades = await Trade.countDocuments();
    const totalRevenue = await Payment.aggregate([
      { $match: { status: "paid" } },
      { $group: { _id: null, total: { $sum: "$finalAmount" } } },
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        activeUsers,
        totalTrades,
        totalRevenue: totalRevenue[0]?.total || 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all coupons
// @route   GET /api/admin/coupons
// @access  Private/Admin
const getAllCoupons = async (req, res, next) => {
  try {
    const coupons = await Coupon.find()
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: { coupons },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create coupon
// @route   POST /api/admin/coupons
// @access  Private/Admin
const createCoupon = async (req, res, next) => {
  try {
    const couponData = {
      ...req.body,
      createdBy: req.user.id,
    };

    const coupon = await Coupon.create(couponData);

    await SystemLog.log("info", `Coupon created: ${coupon.code}`, "admin", {
      adminId: req.user.id,
      couponId: coupon._id,
    });

    res.status(201).json({
      success: true,
      message: "Coupon created successfully",
      coupon,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update coupon
// @route   PUT /api/admin/coupons/:id
// @access  Private/Admin
const updateCoupon = async (req, res, next) => {
  try {
    const coupon = await Coupon.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Coupon not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Coupon updated successfully",
      coupon,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete coupon
// @route   DELETE /api/admin/coupons/:id
// @access  Private/Admin
const deleteCoupon = async (req, res, next) => {
  try {
    const coupon = await Coupon.findByIdAndDelete(req.params.id);

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Coupon not found",
      });
    }

    await SystemLog.log("info", `Coupon deleted: ${coupon.code}`, "admin", {
      adminId: req.user.id,
      couponId: coupon._id,
    });

    res.status(200).json({
      success: true,
      message: "Coupon deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Emergency stop all trades
// @route   POST /api/admin/emergency-stop
// @access  Private/Admin
const emergencyStopAll = async (req, res, next) => {
  try {
    // Stop trading for all users
    await User.updateMany({}, { tradingActive: false });

    // Log emergency stop
    await SystemLog.log("warning", "Emergency stop activated - All trading stopped", "admin", {
      adminId: req.user.id,
      timestamp: new Date(),
    });

    res.status(200).json({
      success: true,
      message: "Emergency stop activated - All trading stopped",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboard,
  getAllUsers,
  updateUser,
  deleteUser,
  toggleUserTrading,
  getSystemLogs,
  getSystemStats,
  getAllCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  emergencyStopAll,
};


