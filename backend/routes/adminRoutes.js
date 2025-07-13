const express = require("express");
const router = express.Router();
const {
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
} = require("../controllers/adminController");
const { protect, authorize } = require("../middleware/auth");

// Protect all admin routes
router.use(protect);
router.use(authorize("admin"));

// Admin Dashboard
router.get("/dashboard", getDashboard);

// User Management
router.get("/users", getAllUsers);
router.put("/users/:id", updateUser);
router.delete("/users/:id", deleteUser);
router.post("/users/:id/toggle-trading", toggleUserTrading);

// System Logs
router.get("/logs", getSystemLogs);

// System Stats
router.get("/stats", getSystemStats);

// Coupon Management
router.get("/coupons", getAllCoupons);
router.post("/coupons", createCoupon);
router.put("/coupons/:id", updateCoupon);
router.delete("/coupons/:id", deleteCoupon);

// Emergency Stop
router.post("/emergency-stop", emergencyStopAll);

module.exports = router;


