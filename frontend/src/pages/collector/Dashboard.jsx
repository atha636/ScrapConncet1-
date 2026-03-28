import { useEffect, useState } from "react";
import { getAvailable, acceptPickup } from "../../services/pickupService";
import Navbar from "../../components/layout/Navbar";

export default function CollectorDashboard() {
  const [data, setData] = useState([]);

  useEffect(() => {
    getAvailable().then(res => setData(res.data));
  }, []);

  return (
    <>
      <Navbar />
      <div className="p-6">
        <h2 className="text-xl font-bold mb-4">Available Pickups</h2>

        {data.map(p => (
          <div key={p._id} className="border p-3 mb-2">
            <p>{p.scrapType}</p>
            <p>₹{p.price}</p>

            <button
              onClick={() => acceptPickup(p._id)}
              className="bg-green-500 text-white px-3 py-1 rounded">
              Accept
            </button>
          </div>
        ))}
      </div>
    </>
  );
}