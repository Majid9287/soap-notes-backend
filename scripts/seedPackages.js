import mongoose from "mongoose";
import { config } from "dotenv";
import "dotenv/config";
import Package from "../models/Package.js";
config();

const MONGO_URI = process.env.MONGO_URI;

const packages = [
  {
    name: "Premium",
    price: {
      amount: 89,
      currency: "USD",
      billingCycle: "monthly",
    },
    features: {
      audioSoapNotes: "unlimited",
      textSoapNotes: "unlimited",
      audioFileLength: {
        value: 3,
        unit: "hours",
      },
    },
    yearlyDiscount: 10,
  },
  {
    name: "Standard",
    price: {
      amount: 59,
      currency: "USD",
      billingCycle: "monthly",
    },
    features: {
      audioSoapNotes: 50,
      textSoapNotes: 100,
      audioFileLength: {
        value: 1,
        unit: "hours",
      },
    },
    yearlyDiscount: 10,
  },
  {
    name: "Basic",
    price: {
      amount: 39,
      currency: "USD",
      billingCycle: "monthly",
    },
    features: {
      audioSoapNotes: 20,
      textSoapNotes: 50,
      audioFileLength: {
        value: 30,
        unit: "minutes",
      },
    },
    yearlyDiscount: 10,
  },
  {
    name: "Free",
    price: {
      amount: 0,
      currency: "USD",
      billingCycle: "free",
    },
    features: {
      audioSoapNotes: 3,
      textSoapNotes: 5,
      audioFileLength: {
        value: 10,
        unit: "minutes",
      },
    },
    yearlyDiscount: 0,
    trialDays: 0,
  },
];

mongoose
  .connect(`${MONGO_URI}`)
  .then(async () => {
    console.log("Connected to MongoDB");

    for (const pkg of packages) {
      await Package.findOneAndUpdate(
        { name: pkg.name }, // Match by package name
        pkg, // Update with the package data
        { upsert: true, new: true } // Create if not found, return the updated/created document
      );
    }

    console.log("Packages seeded successfully");
    //  mongoose.connection.close();
  })
  .catch((error) => {
    console.error("Error connecting to MongoDB", error);
  });
