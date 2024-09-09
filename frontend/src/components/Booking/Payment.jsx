/* eslint-disable react/prop-types */
import { useState } from "react";
import { useDateFormatting } from "../../hooks/useDateFormatting";
import {
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { PulseLoader } from "react-spinners";
import { useSelector } from "react-redux";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import errorIcon from "../../assets/basicIcon/errorIcon.png";
import Select from "react-select";
import { API } from "../../backend";

const Payment = ({ searchParamsObj, paymentMethod, setPaymentMethod }) => {
  const user = useSelector((state) => state.user.userDetails);
  const newReservationData = useSelector(
    (state) => state.reservations?.newReservationsData
  );
  const listingData = useSelector(
    (state) => state.house.listingDetails.listing
  );
  const navigate = useNavigate();
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState("");
  //   geting the checkin and checkout dates
  const dateObj = {
    checkin: searchParamsObj?.checkin,
    checkout: searchParamsObj?.checkout,
  };

  //   dates
  const formattedDates = useDateFormatting(dateObj);
  //   reservation data
  const guestNumber = newReservationData
    ? newReservationData.guestNumber
    : searchParamsObj?.numberOfGuests;
  const checkin = newReservationData
    ? newReservationData?.checkIn
    : searchParamsObj.checkin;
  const checkout = newReservationData
    ? newReservationData?.checkOut
    : searchParamsObj?.checkout;
  const nightStaying = newReservationData
    ? newReservationData?.nightStaying
    : searchParamsObj?.nightStaying;
  const orderId = Math.round(Math.random() * 10000000000);

  // reservation form handler
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!user) {
      toast.error("You need to log in first!");

      setTimeout(() => {
        navigate("/");
      }, 500);
    } else {
      if (!stripe || !elements) {
        return;
      }

      // setIsProcessing(true);

      if (paymentMethod.name === "Cryptocurrency") {
        const basePrice =
          parseInt(nightStaying) !== 0
            ? parseInt(nightStaying) * listingData?.basePrice
            : listingData?.basePrice;

        const tax =
          basePrice !== 0
            ? Math.round((basePrice * 14) / 100)
            : Math.round((listingData?.basePrice * 14) / 100);

        const totalPrice = basePrice + tax;

        console.log({
          authorId: listingData?.author,
          nightStaying,
          totalPrice,
        });
        const { error } = await fetch(`${API}reservations/crypto_payment`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            authorId: listingData?.author,
            nightStaying,
            totalPrice,
          }),
        });
        // const { error } = await axios.post(`${API}crypto_payment`, {
        //   authorId: listingData?.author,
        //   nightStaying,
        //   totalPrice,
        // });

        if (error) {
          setMessage(error.message);
          toast.error("Payment failed. Try again!");
        }
      } else {
        const { error } = await stripe.confirmPayment({
          elements,
          confirmParams: {
            return_url: `${window.location.origin}/payment-confirmed?guestNumber=${guestNumber}&checkIn=${checkin}&checkOut=${checkout}&listingId=${listingData?._id}&authorId=${listingData?.author}&nightStaying=${nightStaying}&orderId=${orderId}`,
          },
        });

        if (error) {
          setMessage(error.message);
          toast.error("Payment failed. Try again!");
        }
      }

      setIsProcessing(false);
    }
  };
  return (
    <div>
      {/* trips section */}
      <div className=" flex flex-col gap-6">
        <h5 className="text-xl md:text-[22px] text-[#222222] font-medium">
          Your trip
        </h5>
        {/* dates */}
        <div className=" flex flex-row justify-between">
          <span className="text-sm md:text-base text-[#222222]">
            <p className="font-medium">Dates</p>
            <p>{formattedDates}</p>
          </span>
          {/* guests */}
          <span className="text-sm md:text-base text-[#222222]">
            <p className="font-medium">Guests</p>
            <p>
              {guestNumber} {guestNumber === "1" ? "guest" : "guests"}
            </p>
          </span>
        </div>
        <hr className="w-full h-[1.3px] bg-[#dddddd] my-4" />
        {/* payment element */}
        <form onSubmit={handleSubmit}>
          <div className="flex items-center pb-4 justify-between">
            <h5 className="text-xl md:text-[22px] text-[#222222] font-medium">
              Pay with
            </h5>
            <Select
              options={["Credit card", "Cryptocurrency"].map((card) => ({
                name: card,
              }))}
              getOptionLabel={(options) => options["name"]}
              getOptionValue={(options) => options["name"]}
              defaultValue={{ name: "Cryptocurrency" }}
              // value={paymentMethod}
              onChange={(item) => {
                setPaymentMethod(item);
              }}
              placeholder="Payment method"
              styles={{
                control: (provided) => ({
                  ...provided,
                  borderRadius: "8px",
                }),
              }}
            />
          </div>
          {paymentMethod.name === "Cryptocurrency" ? <></> : <PaymentElement />}
          <hr className="w-full h-[1.3px] bg-[#dddddd] my-10" />
          <div>
            <h5 className="text-xl md:text-[22px] text-[#222222] font-medium">
              Ground rules
            </h5>
            <p className="text-sm md:text-base text-[#222222] py-4">
              We ask every guest to remember a few simple things about what
              makes a great guest.
            </p>
            <ul className="text-sm md:text-base list-disc pl-5">
              <li>Follow the house rules </li>
              <li>Treat your Host’s home like your own</li>
            </ul>
          </div>
          <hr className="w-full h-[1.3px] bg-[#dddddd] my-10" />
          <p className="text-xs opacity-70">
            By selecting the button below, I agree to the Host&apos;s House
            Rules, Ground rules for guests, Motel&apos;s Rebooking and Refund
            Policy, and that Motel can charge my payment method if I’m
            responsible for damage.
          </p>

          <button
            type="submit"
            disabled={isProcessing}
            className="w-full md:max-w-[180px] mt-7 px-5 py-3 rounded-md bg-[#ff385c] hover:bg-[#d90b63] transition duration-200 ease-in text-white font-medium cursor-pointer disabled:cursor-not-allowed disabled:opacity-30 disabled:bg-gray-400 min-w-[180px]"
          >
            {isProcessing ? (
              <>
                <PulseLoader size={8} color="#000000" speedMultiplier={0.5} />
              </>
            ) : (
              "Confirm and pay"
            )}
          </button>
          {message && (
            <div
              role="alert"
              className=" flex flex-row items-center gap-2 mt-1"
            >
              <img
                src={errorIcon}
                alt="Last name is requires"
                className="w-5"
              />
              <p className="text-xs text-[#c13515]">{message}</p>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default Payment;
