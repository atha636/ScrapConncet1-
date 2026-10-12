// A pickup can be worked by its collector (the owner) OR by the team member
// the owner assigned it to. Used in query filters so staff can run the same
// start / complete flow, while earnings still land with pickup.collector.
const actorFilter = (userId) => ({ $or: [{ collector: userId }, { assignedTo: userId }] });

const isActor = (pickup, userId) =>
  String(pickup.collector?._id || pickup.collector) === String(userId) ||
  (pickup.assignedTo && String(pickup.assignedTo._id || pickup.assignedTo) === String(userId));

module.exports = { actorFilter, isActor };