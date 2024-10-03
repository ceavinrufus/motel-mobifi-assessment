import { useState } from "react";
import { Link } from "react-router-dom";
import { ethers } from "ethers"; // Ensure ethers is installed
import { abi } from "../../../abi/RentalPayments.json"; // ABI from your smart contract
import { toast } from "react-hot-toast";

/* eslint-disable react/prop-types */
const CompletedReservations = ({ data }) => {
  const [disputeEvidence, setDisputeEvidence] = useState({
    text: "",
    image: null,
  });
  const [submitting, setSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState(null);
  const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS; // Smart contract address

  // Handle dispute form change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setDisputeEvidence((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    setDisputeEvidence((prev) => ({ ...prev, image: file }));
  };

  // Function to raise dispute via smart contract
  const raiseDispute = async (bookingId) => {
    setSubmitting(true);
    try {
      // Connect to smart contract
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, abi, signer);

      // Raise dispute using specified booking ID
      const transaction = await contract.raiseDispute(bookingId);
      await transaction.wait(); // Wait for confirmation

      toast.success("Dispute raised successfully");
    } catch (error) {
      console.error("Failed to raise dispute:", error);
      toast.error("Error raising dispute");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col overflow-x-auto">
      <div className="">
        <div className="inline-block min-w-full py-2">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm font-light">
              <thead className="text-xs text-[#717171] font-medium border-b border-[#dddddd]">
                <tr>
                  <th scope="col" className="px-6 py-4">
                    S.NO
                  </th>
                  <th scope="col" className="px-6 py-4">
                    ORDER ID
                  </th>
                  <th scope="col" className="px-6 py-4">
                    LISTING
                  </th>
                  <th scope="col" className="px-6 py-4">
                    GUEST
                  </th>
                  <th scope="col" className="px-6 py-4">
                    NIGHT
                  </th>
                  <th scope="col" className="px-6 py-4">
                    EARNED
                  </th>
                  <th scope="col" className="px-6 py-4">
                    CHECK IN
                  </th>
                  <th scope="col" className="px-6 py-4">
                    CHECK OUT
                  </th>
                  <th scope="col" className="px-6 py-4">
                    DISPUTE
                  </th>
                </tr>
              </thead>
              <tbody>
                {data?.map((listing, i, arr) => {
                  const checkIn = new Date(
                    listing.checkIn
                  ).toLocaleDateString();
                  const checkOut = new Date(
                    listing.checkOut
                  ).toLocaleDateString();
                  const isWithinDisputePeriod =
                    new Date() <=
                    new Date(listing.checkOut).getTime() +
                      7 * 24 * 60 * 60 * 1000;

                  return (
                    <tr
                      key={i}
                      className={`${
                        i === arr.length - 1 ? "" : "border-b border-[#dddddd]"
                      }`}
                    >
                      {/* serial */}
                      <td className=" px-6 py-4 w-[120px]">
                        <p className="text-sm text-[#222222]">{i + 1}</p>
                      </td>
                      {/* see listing btn */}
                      <td className=" px-6 py-4 w-[120px]">
                        <Link
                          to={`/rooms/${listing.listingId}`}
                          className=" text-sm text-gray-800 font-medium  underline hover:text-blue-500 transition-all duration-200 ease-in"
                        >
                          See listing
                        </Link>
                      </td>
                      {/* order id*/}
                      <td className=" px-6 py-4 w-[120px]">
                        <p className="text-sm text-[#222222]">
                          {listing.orderId}
                        </p>
                      </td>
                      {/* guest number */}
                      <td className=" px-6 py-4 w-[120px]">
                        <p className="text-sm text-[#222222]">
                          {listing.guestNumber}
                        </p>
                      </td>
                      {/* night staying */}
                      <td className=" px-6 py-4 w-[120px]">
                        <p className="text-sm text-[#222222]">
                          {listing.nightStaying}
                        </p>
                      </td>
                      {/* author earned */}
                      <td className=" px-6 py-4 w-[120px]">
                        <p className="text-sm text-[#222222]">
                          ${listing.authorEarnedPrice}
                        </p>
                      </td>
                      {/* check in */}
                      <td className=" px-6 py-4 w-[120px]">
                        <p className="text-sm text-[#222222]">{checkIn}</p>
                      </td>
                      {/* check out */}
                      <td className=" px-6 py-4 w-[120px]">
                        <p className="text-sm text-[#222222]">{checkOut}</p>
                      </td>
                      <td className="px-6 py-4">
                        {isWithinDisputePeriod ? (
                          <button
                            onClick={() => {
                              setShowModal(true);
                              setSelectedBookingId(listing.orderId);
                            }}
                            className="px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700 transition-all"
                          >
                            Raise Dispute
                          </button>
                        ) : (
                          <span className="text-gray-500">
                            Dispute period ended
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal for raising dispute */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-6 rounded-md shadow-lg max-w-md w-full">
            <h2 className="text-lg font-semibold mb-4">Raise Dispute</h2>
            <textarea
              name="text"
              value={disputeEvidence.text}
              onChange={handleInputChange}
              placeholder="Enter dispute reason"
              className="block w-full mb-4 p-2 border text-sm"
            />
            <input
              type="file"
              name="image"
              onChange={handleImageChange}
              className="block w-full mb-4 text-sm"
              accept="image/*"
            />
            <div className="flex justify-end space-x-4 text-sm">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-gray-600 border border-gray-400 rounded hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={() => raiseDispute(selectedBookingId)}
                disabled={submitting}
                className={`px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700 transition-all ${
                  submitting && "opacity-50 cursor-not-allowed"
                }`}
              >
                {submitting ? "Submitting..." : "Submit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompletedReservations;
