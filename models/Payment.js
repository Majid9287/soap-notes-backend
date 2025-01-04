import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    package: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Package",
      required: true,
    },
    stripePaymentId: {
      type: String, // Stripe's unique payment identifier
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: "USD",
    },
    status: {
        type: String,
        enum: [
          "requires_payment_method",
          "requires_confirmation",
          "requires_action",
          "processing",
          "requires_capture",
          "canceled",
          "succeeded",
        ],
        default: "requires_payment_method",
      
    },
    couponCode: {
      type: String,
      default: null, // Optional, can be null if no coupon is applied
    },
    plan: {
      type: String,
      enum: ["yearly", "monthly"], // Restricts values to 'yearly' or 'monthly'
      required: true,
    },
   
  },
  {
    timestamps: true,
  }
);



const Payment = mongoose.model("Payment", paymentSchema);

export default Payment;
