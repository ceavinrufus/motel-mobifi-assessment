import { useEffect, useState } from "react";

import { useDispatch, useSelector } from "react-redux";
import { createNewHouse } from "../../redux/actions/houseActions";

const WalletAddress = () => {
  const newHouseData = useSelector((state) => state.house.newHouse);
  const [walletAddress, setWalletAddress] = useState("0x");
  const dispatch = useDispatch();

  const handleInputChange = (event) => {
    const newValue = event.target.value;
    setWalletAddress(newValue);
  };

  useEffect(() => {
    dispatch(
      createNewHouse(
        newHouseData?.houseType,
        newHouseData?.privacyType,
        newHouseData?.location,
        newHouseData?.floorPlan,
        newHouseData?.amenities,
        newHouseData?.photos,
        newHouseData?.title,
        newHouseData?.highlights,
        newHouseData?.description,
        newHouseData?.guestType,
        newHouseData?.priceBeforeTaxes,
        newHouseData?.authorEarnedPrice,
        newHouseData?.basePrice,
        walletAddress
      )
    );
  }, [walletAddress]);

  return (
    <div className=" flex flex-col max-w-screen-md mx-auto my-6 min-h-[70vh]">
      <div>
        <h1 className=" text-[#222222] text-xl sm:text-2xl md:text-[32px] font-medium">
          Put in your wallet address
        </h1>
        <p className=" text-sm sm:text-base md:text-lg text-[#717171]">
          This is where you will receive the payment for your listing
        </p>
      </div>
      {/* Address */}
      <div className=" mt-10 w-full">
        <div className=" flex flex-row items-center relative">
          <textarea
            type="text"
            placeholder="0x"
            value={walletAddress}
            rows={6}
            onChange={handleInputChange}
            className=" text-[#222222] sm:text-4xl md:text-6xl font-semibold focus:outline-none placeholder:text-[#A6B5D2]"
          />
        </div>
      </div>
    </div>
  );
};

export default WalletAddress;
