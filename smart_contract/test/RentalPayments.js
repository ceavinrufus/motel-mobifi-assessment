const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("RentalPayments", function () {
  async function deployContractAndSetVariables() {
    // Deploy the contract before each test
    const [admin, manager, renter, owner] = await ethers.getSigners();
    const RentalPayments = await ethers.getContractFactory("RentalPayments");
    const rentalPayments = await RentalPayments.deploy();

    return { rentalPayments, admin, manager, renter, owner };
  }

  describe("Secure Payment Handling", function () {
    it("should allow payments with 5% commission to MobiFiAdmin", async function () {
      const { rentalPayments, admin, renter, owner } = await loadFixture(
        deployContractAndSetVariables
      );

      // Setup: Define the amount and send the payment
      const bookingDuration = 30 * 24 * 60 * 60; // 30 days in seconds
      const paymentAmount = ethers.parseEther("1.0"); // 1 Ether
      const commission = (paymentAmount * 5n) / 100n; // 5% commission

      // Record initial balances
      const initialAdminBalance = await ethers.provider.getBalance(
        admin.address
      );

      // Initiate payment
      await rentalPayments
        .connect(renter)
        .initiatePayment(owner.address, bookingDuration, {
          value: paymentAmount,
        });

      // Check if commission is transferred to admin
      const newAdminBalance = await ethers.provider.getBalance(admin.address);
      expect(newAdminBalance - initialAdminBalance).to.equal(commission);

      // Verify the booking details
      const booking = await rentalPayments.bookings(1);
      expect(booking.renter).to.equal(renter.address);
      expect(booking.owner).to.equal(owner.address);
      expect(booking.amount).to.equal(paymentAmount - commission);
      expect(booking.startTime).to.be.gt(0);
      expect(booking.endTime).to.be.gt(0);
    });
  });

  describe("Dispute Resolution", function () {
    it("should allow dispute raising within 7 days after booking ends", async function () {
      const { rentalPayments, renter, owner } = await loadFixture(
        deployContractAndSetVariables
      );

      // Setup: Initiate payment and simulate time passing
      const bookingDuration = 1; // 1 second for test simplicity
      const paymentAmount = ethers.parseEther("1.0");

      await rentalPayments
        .connect(renter)
        .initiatePayment(owner.address, bookingDuration, {
          value: paymentAmount,
        });
      await ethers.provider.send("evm_increaseTime", [2]); // Simulate 2 seconds passing

      // Raise a dispute
      await rentalPayments.connect(renter).raiseDispute(1);

      // Check dispute status
      const booking = await rentalPayments.bookings(1);
      expect(booking.isDisputeRaised).to.be.true;
    });

    it("should prevent payment release if a dispute is raised", async function () {
      const { rentalPayments, renter, owner } = await loadFixture(
        deployContractAndSetVariables
      );

      // Setup: Initiate payment and raise a dispute
      const bookingDuration = 1; // 1 second
      const paymentAmount = ethers.parseEther("1.0");

      await rentalPayments
        .connect(renter)
        .initiatePayment(owner.address, bookingDuration, {
          value: paymentAmount,
        });

      // Simulate 1 second passing (end of booking) and then 7 days (dispute period)
      await ethers.provider.send("evm_increaseTime", [1]); // Simulate 1 second passing
      await ethers.provider.send("evm_increaseTime", [7 * 24 * 60 * 60]); // Simulate 7 days passing

      // Raise a dispute
      await rentalPayments.connect(renter).raiseDispute(1);

      // Attempt to release payment
      await expect(rentalPayments.releasePayment(1)).to.be.revertedWith(
        "Dispute raised"
      );
    });

    it("should allow dispute resolution by admin or manager", async function () {
      const { rentalPayments, admin, manager, renter, owner } =
        await loadFixture(deployContractAndSetVariables);

      // Setup: Initiate payment and raise a dispute
      const bookingDuration = 1; // 1 second
      const paymentAmount = ethers.parseEther("1.0");

      await rentalPayments
        .connect(renter)
        .initiatePayment(owner.address, bookingDuration, {
          value: paymentAmount,
        });
      await ethers.provider.send("evm_increaseTime", [2]); // Simulate 2 seconds passing
      await rentalPayments.connect(renter).raiseDispute(1);

      // Add manager
      await rentalPayments.connect(admin).addManager(manager.address);

      // Resolve dispute in favor of the renter
      await rentalPayments.connect(manager).resolveDispute(1, true);

      // Check the resolution
      const booking = await rentalPayments.bookings(1);
      expect(booking.isResolved).to.be.true;
      expect(await ethers.provider.getBalance(renter.address)).to.be.above(
        paymentAmount
      );
    });
  });

  describe("Role Management", function () {
    it("should allow admin to add and remove managers", async function () {
      const { rentalPayments, admin, manager } = await loadFixture(
        deployContractAndSetVariables
      );

      // Add manager
      await rentalPayments.connect(admin).addManager(manager.address);
      expect(await rentalPayments.managers(manager.address)).to.be.true;

      // Remove manager
      await rentalPayments.connect(admin).removeManager(manager.address);
      expect(await rentalPayments.managers(manager.address)).to.be.false;
    });

    it("should restrict manager functionality to admin or managers", async function () {
      const { rentalPayments, admin, manager, renter, owner } =
        await loadFixture(deployContractAndSetVariables);

      // Setup: Initiate payment and raise a dispute
      const bookingDuration = 1; // 1 second
      const paymentAmount = ethers.parseEther("1.0");

      await rentalPayments
        .connect(renter)
        .initiatePayment(owner.address, bookingDuration, {
          value: paymentAmount,
        });
      await ethers.provider.send("evm_increaseTime", [2]); // Simulate 2 seconds passing
      await rentalPayments.connect(renter).raiseDispute(1);

      // Add manager
      await rentalPayments.connect(admin).addManager(manager.address);

      // Attempt to resolve dispute as a non-manager
      await expect(
        rentalPayments.connect(renter).resolveDispute(1, true)
      ).to.be.revertedWith("Not authorized");

      // Resolve dispute as a manager
      await rentalPayments.connect(manager).resolveDispute(1, true);
      const booking = await rentalPayments.bookings(1);
      expect(booking.isResolved).to.be.true;
    });
  });
});
