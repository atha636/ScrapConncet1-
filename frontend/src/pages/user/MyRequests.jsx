import { useEffect, useState } from "react";
import { getMyRequests } from "../../services/pickupService";
import Navbar from "../../components/layout/Navbar";

export default function MyRequests() {
  const [data, setData] = useState([]);

  useEffect(() => {
    getMyRequests().then(res => setData(res.data));
  }, []);

  return (
    <>
      <Navbar />
      <div className="p-6">
        <h2 className="text-xl font-bold mb-4">My Requests</h2>

        {data.map(p => (
          <div key={p._id} className="border p-3 mb-2">
            <p>{p.scrapType}</p>
            <p>₹{p.price}</p>
            <p>Status: {p.status}</p>
          </div>
        ))}
      </div>
    </>
  );
}