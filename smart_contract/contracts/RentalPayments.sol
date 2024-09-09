// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract RentalPayments {
    // Define roles
    address public mobiFiAdmin;
    mapping(address => bool) public managers;

    // Structure to hold booking details
    struct Booking {
        address renter;
        address owner;
        uint256 amount;
        uint256 startTime;
        uint256 endTime;
        bool isDisputeRaised;
        bool isResolved;
    }

    // Mappings to store bookings
    mapping(uint256 => Booking) public bookings;
    uint256 public bookingCounter;

    // Event declarations
    event PaymentInitiated(
        uint256 bookingId,
        address indexed renter,
        uint256 amount
    );
    event DisputeRaised(uint256 bookingId);
    event DisputeResolved(uint256 bookingId, bool favorRenter);
    event PaymentReleased(
        uint256 bookingId,
        address indexed owner,
        uint256 amount
    );

    constructor() {
        mobiFiAdmin = msg.sender;
    }

    // Modifier to check if the sender is the admin
    modifier onlyAdmin() {
        require(msg.sender == mobiFiAdmin, "Not authorized");
        _;
    }

    // Modifier to check if the sender is an admin or manager
    modifier onlyAdminOrManager() {
        require(
            msg.sender == mobiFiAdmin || managers[msg.sender] == true,
            "Not authorized"
        );
        _;
    }

    // Function to add a manager
    function addManager(address manager) external onlyAdmin {
        managers[manager] = true;
    }

    // Function to remove a manager
    function removeManager(address manager) external onlyAdmin {
        managers[manager] = false;
    }

    // Function to initiate a payment
    function initiatePayment(
        address owner,
        uint256 bookingDuration
    ) external payable {
        require(msg.value > 0, "Payment must be greater than 0");

        uint256 commission = (msg.value * 5) / 100; // 5% commission
        uint256 amountAfterCommission = msg.value - commission;

        payable(mobiFiAdmin).transfer(commission);

        bookingCounter++;
        bookings[bookingCounter] = Booking({
            renter: msg.sender,
            owner: owner,
            amount: amountAfterCommission,
            startTime: block.timestamp,
            endTime: block.timestamp + bookingDuration,
            isDisputeRaised: false,
            isResolved: false
        });

        emit PaymentInitiated(
            bookingCounter,
            msg.sender,
            amountAfterCommission
        );
    }

    // Function to raise a dispute
    function raiseDispute(uint256 bookingId) external {
        Booking storage booking = bookings[bookingId];
        require(
            msg.sender == booking.renter,
            "Only renter can raise a dispute"
        );
        require(block.timestamp > booking.endTime, "Booking period not ended");
        require(
            block.timestamp <= booking.endTime + 7 days,
            "Dispute period has ended"
        );
        require(!booking.isDisputeRaised, "Dispute already raised");

        booking.isDisputeRaised = true;

        emit DisputeRaised(bookingId);
    }

    // Function to resolve a dispute
    function resolveDispute(
        uint256 bookingId,
        bool favorRenter
    ) external onlyAdminOrManager {
        Booking storage booking = bookings[bookingId];
        require(booking.isDisputeRaised, "No dispute raised");
        require(!booking.isResolved, "Dispute already resolved");

        booking.isResolved = true;

        if (favorRenter) {
            payable(booking.renter).transfer(booking.amount);
        } else {
            payable(booking.owner).transfer(booking.amount);
        }

        emit DisputeResolved(bookingId, favorRenter);
    }

    // Function to release payment if no dispute is raised
    function releasePayment(uint256 bookingId) external {
        Booking storage booking = bookings[bookingId];
        require(
            block.timestamp > booking.endTime + 7 days,
            "Dispute period not ended"
        );
        require(!booking.isDisputeRaised, "Dispute raised");
        require(!booking.isResolved, "Payment already released");

        booking.isResolved = true;

        payable(booking.owner).transfer(booking.amount);

        emit PaymentReleased(bookingId, booking.owner, booking.amount);
    }

    // Function to get all rental payments data
    function getAllRentalPayments() external view returns (Booking[] memory) {
        Booking[] memory allBookings = new Booking[](bookingCounter);

        for (uint256 i = 1; i <= bookingCounter; i++) {
            allBookings[i - 1] = bookings[i];
        }

        return allBookings;
    }
}
