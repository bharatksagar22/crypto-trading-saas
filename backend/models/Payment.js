const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Payment Details
  razorpayOrderId: {
    type: String,
    required: true
  },
  razorpayPaymentId: {
    type: String,
    default: ''
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'INR'
  },
  status: {
    type: String,
    enum: ['created', 'paid', 'failed', 'refunded'],
    default: 'created'
  },
  
  // Plan Details
  planType: {
    type: String,
    enum: ['basic', 'pro', 'elite'],
    required: true
  },
  planDuration: {
    type: Number,
    required: true // in months
  },
  
  // Discounts
  couponCode: {
    type: String,
    default: ''
  },
  discountPercent: {
    type: Number,
    default: 0
  },
  referralDiscount: {
    type: Number,
    default: 0
  },
  finalAmount: {
    type: Number,
    required: true
  },
  
  // Additional Info
  paymentMethod: String,
  receipt: String,
  notes: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Indexes
paymentSchema.index({ userId: 1, createdAt: -1 });
paymentSchema.index({ razorpayOrderId: 1 });
paymentSchema.index({ razorpayPaymentId: 1 });

// Update user subscription after successful payment
paymentSchema.post('save', async function() {
  if (this.status === 'paid') {
    const User = require('./User');
    const user = await User.findById(this.userId);
    
    if (user) {
      const now = new Date();
      const endDate = new Date(now);
      endDate.setMonth(endDate.getMonth() + this.planDuration);
      
      user.subscriptionPlan = this.planType;
      user.subscriptionStatus = 'active';
      user.subscriptionStartDate = now;
      user.subscriptionEndDate = endDate;
      
      await user.save();
    }
  }
});

module.exports = mongoose.model('Payment', paymentSchema);

