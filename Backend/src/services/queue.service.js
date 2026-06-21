exports.calculateWaitingTime = (tickets, avgTime) => {
  return tickets.length * avgTime;
};