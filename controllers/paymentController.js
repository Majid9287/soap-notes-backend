import stripe from "../config/stripe.js";
import Payment from "../models/Payment.js";
import User from "../models/UserModel.js";
import Package from "../models/Package.js";
import ApiKey from "../models/ApiKey.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";
import { sendSuccessResponse } from "../utils/responseHandler.js";

// Create Payment Intent
export const createPaymentIntent = catchAsync(async (req, res, next) => {
  const { currency = "usd", packageId, couponCode, plan } = req.body;
  const userId = req.user?.id;
console.log("pay",req.body)
  if (!packageId || !plan) {
    return next(
      new AppError("Missing required fields: packageId and plan", 400)
    );
  }

  // Get package details
  const selectedPackage = await Package.findById(packageId);
  if (!selectedPackage) {
    return next(new AppError("Package not found", 404));
  }

  // Calculate the amount based on the plan
  let amount = selectedPackage.price.amount;
  if (plan === "yearly") {
    amount = selectedPackage.calculateYearlyPrice();
  }

  if (amount <= 0) {
    return next(new AppError("Invalid package amount", 400));
  }

  // Create a Stripe PaymentIntent
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100), // Convert to cents
    currency,
    metadata: { userId, packageId, packageName: selectedPackage.name, plan },
  });
 console.log("pay",paymentIntent,paymentIntent.status)
  // Save payment details in the database
  const payment = await Payment.create({
    user: userId,
    package: packageId,
    stripePaymentId: paymentIntent.id,
    amount,
    currency,
    status: paymentIntent.status,
    couponCode,
    plan,
  });

  sendSuccessResponse(
    res,
    {
      clientSecret: paymentIntent.client_secret,
      payment,
    },
    "PaymentIntent created successfully."
  );
});

// Confirm Payment
export const confirmPayment = catchAsync(async (req, res, next) => {
  const { paymentIntentId, paymentMethodId } = req.body;
  const userId = req.user?.id;
console.log("confirm",req.body)
  if (!paymentIntentId || !paymentMethodId) {
    return next(
      new AppError(
        "Missing required fields: paymentIntentId and paymentMethodId",
        400
      )
    );
  }

  if (!userId) {
    return next(new AppError("User not authenticated", 401));
  }
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
  console.log("confirm",paymentIntent )
  if (!paymentIntent) {
    return res.status(404).json({ success: false, message: "PaymentIntent not found" });
  }

  if(paymentIntent.status != "succeeded"){
  paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId, {
    payment_method: paymentMethodId,
  }); }
  // Update payment status in the database
  const payment = await Payment.findOneAndUpdate(
    { stripePaymentId: paymentIntentId },
    { status: paymentIntent.status },
    { new: true }
  );

  if (!payment) {
    return next(new AppError("Payment not found", 404));
  }

  // Handle successful payment
  if (paymentIntent.status === "succeeded") {
    const user = await User.findById(payment.user);
    if (user) {
      user.package = payment.package;
      await user.save();

      // Update API key for the user
      await ApiKey.findOneAndUpdate(
        { userId },
        {
          status: "active",
          packageId: payment.package,
          audioUsage: 0,
          textUsage: 0,
          lastReset: Date.now(),
          nextReset: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Next reset in 30 days
        },
        { new: true }
      );
    }
  }

  sendSuccessResponse(res, payment, "Payment confirmed successfully.");
});

// Get Package Details Helper
export const getPackageDetails = async (packageId, plan) => {
  const selectedPackage = await Package.findById(packageId);
  if (!selectedPackage) {
    throw new AppError("Package not found", 404);
  }

  let amount = selectedPackage.price.amount;
  if (plan === "yearly") {
    amount = selectedPackage.calculateYearlyPrice();
  }

  return { package: selectedPackage, amount };
};
