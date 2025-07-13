const Razorpay = require('razorpay');
const crypto = require('crypto');

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Plan pricing (in INR)
const PLAN_PRICING = {
  basic: {
    1: 999,    // 1 month
    3: 2499,   // 3 months
    6: 4499,   // 6 months
    12: 7999   // 12 months
  },
  pro: {
    1: 1999,
    3: 4999,
    6: 8999,
    12: 15999
  },
  elite: {
    1: 3999,
    3: 9999,
    6: 17999,
    12: 31999
  }
};

// Create Razorpay order
const createOrder = async (amount, currency = 'INR', receipt = null) => {
  try {
    const options = {
      amount: amount * 100, // Razorpay expects amount in paise
      currency,
      receipt: receipt || `receipt_${Date.now()}`,
      payment_capture: 1
    };

    const order = await razorpay.orders.create(options);
    return order;
  } catch (error) {
    console.error('Razorpay order creation error:', error);
    throw new Error('Failed to create payment order');
  }
};

// Verify payment signature
const verifyPaymentSignature = (razorpayOrderId, razorpayPaymentId, razorpaySignature) => {
  try {
    const body = razorpayOrderId + '|' + razorpayPaymentId;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    return expectedSignature === razorpaySignature;
  } catch (error) {
    console.error('Payment signature verification error:', error);
    return false;
  }
};

// Get payment details
const getPaymentDetails = async (paymentId) => {
  try {
    const payment = await razorpay.payments.fetch(paymentId);
    return payment;
  } catch (error) {
    console.error('Get payment details error:', error);
    throw new Error('Failed to fetch payment details');
  }
};

// Calculate plan amount with discounts
const calculatePlanAmount = (planType, duration, couponDiscount = 0, referralDiscount = 0) => {
  const baseAmount = PLAN_PRICING[planType]?.[duration];
  if (!baseAmount) {
    throw new Error('Invalid plan type or duration');
  }

  let finalAmount = baseAmount;
  
  // Apply coupon discount
  if (couponDiscount > 0) {
    finalAmount = finalAmount - (finalAmount * couponDiscount / 100);
  }
  
  // Apply referral discount
  if (referralDiscount > 0) {
    finalAmount = finalAmount - (finalAmount * referralDiscount / 100);
  }

  return {
    baseAmount,
    couponDiscount,
    referralDiscount,
    finalAmount: Math.round(finalAmount)
  };
};

// Create subscription order
const createSubscriptionOrder = async (userId, planType, duration, couponCode = null, referralCode = null) => {
  try {
    const Coupon = require('../models/Coupon');
    const User = require('../models/User');
    
    let couponDiscount = 0;
    let referralDiscount = 0;
    let coupon = null;

    // Validate and apply coupon
    if (couponCode) {
      coupon = await Coupon.findOne({ code: couponCode.toUpperCase() });
      if (coupon) {
        const validation = coupon.isValid(userId);
        if (validation.valid) {
          couponDiscount = coupon.discountPercent;
        } else {
          throw new Error(validation.message);
        }
      } else {
        throw new Error('Invalid coupon code');
      }
    }

    // Apply referral discount (for new users)
    if (referralCode) {
      const referrer = await User.findOne({ referralCode });
      if (referrer) {
        referralDiscount = 10; // 10% referral discount
      }
    }

    // Calculate final amount
    const pricing = calculatePlanAmount(planType, duration, couponDiscount, referralDiscount);
    
    // Create Razorpay order
    const order = await createOrder(
      pricing.finalAmount,
      'INR',
      `sub_${userId}_${planType}_${duration}m`
    );

    return {
      order,
      pricing,
      coupon
    };
  } catch (error) {
    console.error('Create subscription order error:', error);
    throw error;
  }
};

// Process refund
const processRefund = async (paymentId, amount = null, reason = 'requested_by_customer') => {
  try {
    const refundData = {
      payment_id: paymentId,
      notes: {
        reason
      }
    };

    if (amount) {
      refundData.amount = amount * 100; // Convert to paise
    }

    const refund = await razorpay.payments.refund(paymentId, refundData);
    return refund;
  } catch (error) {
    console.error('Refund processing error:', error);
    throw new Error('Failed to process refund');
  }
};

// Get all payments for a customer
const getCustomerPayments = async (customerId) => {
  try {
    const payments = await razorpay.payments.all({
      customer_id: customerId
    });
    return payments;
  } catch (error) {
    console.error('Get customer payments error:', error);
    throw new Error('Failed to fetch customer payments');
  }
};

// Create customer
const createCustomer = async (name, email, contact = null) => {
  try {
    const customerData = {
      name,
      email
    };

    if (contact) {
      customerData.contact = contact;
    }

    const customer = await razorpay.customers.create(customerData);
    return customer;
  } catch (error) {
    console.error('Create customer error:', error);
    throw new Error('Failed to create customer');
  }
};

module.exports = {
  razorpay,
  createOrder,
  verifyPaymentSignature,
  getPaymentDetails,
  calculatePlanAmount,
  createSubscriptionOrder,
  processRefund,
  getCustomerPayments,
  createCustomer,
  PLAN_PRICING
};

