const Pickup = require("../models/Pickup");

// Mock AI price logic
const getPrice = (type) => {
  const prices = {
    metal: 50,
    plastic: 20,
    paper: 10
  };
  return prices[type] || 5;
};

exports.createPickup = async (req, res) => {
  try {
    const { scrapType, lat, lng } = req.body;

    const pickup = await Pickup.create({
      user: req.user.id,
      scrapType,
      image: req.file?.path,
      location: { lat, lng },
      price: getPrice(scrapType)
    });

    req.io.emit("newPickup", pickup); // 🔥 socket

    res.json(pickup);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

exports.getMyRequests = async (req, res) => {
  const data = await Pickup.find({ user: req.user.id });
  res.json(data);
};

exports.getAvailable = async (req, res) => {
  const data = await Pickup.find({ status: "pending" });
  res.json(data);
};

exports.acceptPickup = async (req, res) => {
  const pickup = await Pickup.findById(req.params.id);

  pickup.status = "accepted";
  pickup.collector = req.user.id;

  await pickup.save();

  req.io.emit("updatePickup", pickup);

  res.json(pickup);
};

exports.updateStatus = async (req, res) => {
  const pickup = await Pickup.findById(req.params.id);

  pickup.status = req.body.status;

  await pickup.save();

  req.io.emit("updatePickup", pickup);

  res.json(pickup);
};