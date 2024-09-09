require("dotenv").config();
const mongoose = require("mongoose");
const House = require("../models/house.model");
const reservationDB = require("../models/reservation.model");
const { ethers, JsonRpcProvider } = require("ethers");
const { abi } = require("../abi/RentalPayments.json");

// stripe controller & payment process
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

exports.getStripePublishableKey = async (req, res) => {
  res.send({
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
  });
};

exports.createPaymentIntent = async (req, res) => {
  try {
    console.log("hit, payment");
    const payload = req.body;
    console.log(payload);
    const paymentIntent = await stripe.paymentIntents.create({
      currency: "USD",
      amount: 1999,
      automatic_payment_methods: { enabled: true },
    });

    // Send publishable key and PaymentIntent details to client
    res.send({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (e) {
    return res.status(400).send({
      error: {
        message: e.message,
      },
    });
  }
};

exports.cryptoPayment = async (req, res) => {
  try {
    console.log("hit, crypto");
    const payload = req.body;
    const { walletAddress, nightStaying, totalPrice } = payload;

    // Initialize ethers provider and signer
    const provider = new JsonRpcProvider(process.env.ETH_PROVIDER_URL);
    const signer = new ethers.Wallet(process.env.ETH_PRIVATE_KEY, provider);

    // Smart contract ABI and address
    const contractABI = abi;
    const contractAddress = process.env.CONTRACT_ADDRESS;

    // Instantiate the smart contract
    const rentalPaymentsContract = new ethers.Contract(
      contractAddress,
      contractABI,
      signer
    );

    // Convert the base price to wei (assuming basePrice is in ether)
    const value = ethers.parseEther(totalPrice.toString());

    // Call initiatePayment on the smart contract
    const transaction = await rentalPaymentsContract.initiatePayment(
      walletAddress,
      nightStaying,
      { value }
    );

    // Wait for the transaction to be mined
    const receipt = await transaction.wait();

    return receipt;
  } catch (error) {
    console.error("Error during crypto payment:", error);
    throw error;
  }
};

// save new reservation
exports.newReservation = async (req, res) => {
  try {
    const payload = req.body;
    const {
      listingId,
      authorId,
      guestNumber,
      checkIn,
      checkOut,
      nightStaying,
      orderId,
      transactionHash,
    } = payload;

    const findCriteria = {
      _id: new mongoose.Types.ObjectId(listingId),
    };

    const listingDetails = await House.findById(findCriteria);

    const basePrice = parseInt(listingDetails.basePrice);
    const tax = Math.round((parseInt(basePrice) * 14) / 100);
    const authorEarnedPrice =
      basePrice - Math.round((parseInt(basePrice) * 3) / 100);

    let newReservation = {
      listingId,
      authorId,
      guestNumber: parseInt(guestNumber),
      checkIn,
      checkOut,
      nightStaying: parseInt(nightStaying),
      basePrice,
      taxes: tax,
      authorEarnedPrice,
      orderId,
      transactionHash,
    };

    const findSavedListingReservation = await reservationDB.find({
      listingId: listingId,
    });
    console.log(findSavedListingReservation);

    const listing = findSavedListingReservation.map((reservation, i) => {
      return reservation.checkIn === checkIn;
    });

    console.log(listing, "line 80");

    if (!listing.includes(true)) {
      const saveReservation = await reservationDB(newReservation).save();
      console.log(saveReservation);
      res.status(200).send("Payment confirmed.");
    } else {
      res.status(404).send("Something went wrong try again later.");
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("An error occurred.");
  }
};

exports.getAllReservations = async (req, res) => {
  try {
    const payload = req.body;
    const listingId = payload.id;

    const findCriteria = {
      listingId: listingId,
    };

    const reservationsData = await reservationDB.find(findCriteria);

    res.status(200).send(reservationsData);
  } catch (error) {
    console.log(error);
  }
};

exports.getAuthorsReservations = async (req, res) => {
  try {
    const userId = req.user;

    const findCriteria = {
      authorId: userId,
    };

    const authorsListingReservations = await reservationDB.find(findCriteria);

    if (!authorsListingReservations) {
      res.json({ message: "No listing booked yet" });
    }

    res.status(200).send(authorsListingReservations);
  } catch (error) {
    console.log(error);
  }
};
