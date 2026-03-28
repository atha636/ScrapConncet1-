import { useState } from "react";
import { createPickup } from "../../services/pickupService";
import Navbar from "../../components/layout/Navbar";

export default function RequestPickup() {
  const [file, setFile] = useState(null);
  const [type, setType] = useState("metal");

  const handleSubmit = async () => {
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const form = new FormData();

      form.append("scrapType", type);
      form.append("image", file);
      form.append("lat", pos.coords.latitude);
      form.append("lng", pos.coords.longitude);

      await createPickup(form);
      alert("Request sent!");
    });
  };

  return (
    <>
      <Navbar />
      <div className="p-6 space-y-3">
        <select onChange={(e) => setType(e.target.value)}>
          <option>metal</option>
          <option>plastic</option>
          <option>paper</option>
        </select>

        <input type="file"
          onChange={(e) => setFile(e.target.files[0])} />

        <button onClick={handleSubmit}
          className="bg-purple-600 text-white p-2 rounded">
          Submit
        </button>
      </div>
    </>
  );
}