const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  discountPercent: {
    type: Number,
    required: true,
    min: 1,
    max: 100
  },
  maxUses: {
    type: Number,
    required: true,
    min: 1
  },
  currentUses: {
    type: Number,
    default: 0
  },
  validFrom: {
    type: Date,
    required: true
  },
  validTo: {
    type: Date,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Usage tracking
  usedBy: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    usedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Indexes
couponSchema.index({ code: 1 });
couponSchema.index({ validFrom: 1, validTo: 1 });

// Check if coupon is valid
couponSchema.methods.isValid = function(userId = null) {
  const now = new Date();
  
  // Check if coupon is active
  if (!this.isActive) return { valid: false, message: 'Coupon is inactive' };
  
  // Check date validity
  if (now < this.validFrom) return { valid: false, message: 'Coupon is not yet valid' };
  if (now > this.validTo) return { valid: false, message: 'Coupon has expired' };
  
  // Check usage limit
  if (this.currentUses >= this.maxUses) return { valid: false, message: 'Coupon usage limit exceeded' };
  
  // Check if user has already used this coupon
  if (userId && this.usedBy.some(usage => usage.userId.toString() === userId.toString())) {
    return { valid: false, message: 'Coupon already used by this user' };
  }
  
  return { valid: true, message: 'Coupon is valid' };
};

// Use coupon
couponSchema.methods.useCoupon = function(userId) {
  this.currentUses += 1;
  this.usedBy.push({ userId });
  return this.save();
};

module.exports = mongoose.model('Coupon', couponSchema);

