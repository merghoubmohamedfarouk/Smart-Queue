const prisma = require("../config/prisma");

// Helper: emit updated queue info to all connected clients
const emitQueueInfo = async (io) => {
  try {
    const totalInQueue = await prisma.ticket.count({ where: { statut: "EN_ATTENTE" } });
    io.emit("queueInfoUpdated", { totalInQueue });
  } catch (e) {
    console.error("Failed to emit queue info", e);
  }
};

const ALGIERS_OFFSET_MS = 60 * 60 * 1000; // UTC+1

const getAlgiersDayBoundsUtc = (date = new Date()) => {
  const shifted = new Date(date.getTime() + ALGIERS_OFFSET_MS);
  shifted.setUTCHours(0, 0, 0, 0);
  const start = new Date(shifted.getTime() - ALGIERS_OFFSET_MS);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
};

const getAlgiersHour = (date) => {
  const shifted = new Date(new Date(date).getTime() + ALGIERS_OFFSET_MS);
  return shifted.getUTCHours();
};

exports.createTicket = async (req, res) => {
  try {
    const { start, end } = getAlgiersDayBoundsUtc();

    const lastTicketToday = await prisma.ticket.findFirst({
      where: { heureCreation: { gte: start, lt: end } },
      orderBy: { numero: "desc" }
    });

    const ticket = await prisma.ticket.create({
      data: {
        numero: (lastTicketToday?.numero || 0) + 1,
        statut: "EN_ATTENTE"
      }
    });

    req.io.emit("newTicket", ticket);
    await emitQueueInfo(req.io);
    res.json(ticket);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.cancelTicket = async (req, res) => {
  try {
    const ticketId = Number(req.params.id);

    if (!Number.isInteger(ticketId) || ticketId <= 0) {
      return res.status(400).json({ error: "Invalid ticket id" });
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId }
    });

    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    if (ticket.statut !== "EN_ATTENTE") {
      return res.status(409).json({ error: "Ticket can no longer be cancelled" });
    }

    await prisma.ticket.delete({
      where: { id: ticketId }
    });

    req.io.emit("queueUpdated");
    req.io.emit("ticketCancelled", { id: ticket.id, numero: ticket.numero });
    await emitQueueInfo(req.io);

    res.json({ message: "Ticket cancelled successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.callNext = async (req, res) => {
  try {
    // 1. If there's currently an active ticket, mark it as TERMINE
    const activeTicket = await prisma.ticket.findFirst({
      where: { statut: "EN_COURS" }
    });

    if (activeTicket) {
      await prisma.ticket.update({
        where: { id: activeTicket.id },
        data: { statut: "TERMINE", heureFin: new Date() }
      });
      req.io.emit("ticketServed", activeTicket);
    }

    // 2. Find the next waiting ticket globally (Queue is single service now)
    const nextTicket = await prisma.ticket.findFirst({
      where: { statut: "EN_ATTENTE" },
      orderBy: [{ priorite: "desc" }, { heureCreation: "asc" }]
    });

    if (!nextTicket) {
      // Clear current display since we marked the last one done but had no next one
      req.io.emit("callTicket", null);
      return res.json({ message: "Aucun client" });
    }

    // 3. Mark the next one as active
    const updated = await prisma.ticket.update({
      where: { id: nextTicket.id },
      data: { statut: "EN_COURS", heureAppel: new Date() }
    });

    req.io.emit("callTicket", updated);
    await emitQueueInfo(req.io);
    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server Error" });
  }
};

exports.getCurrentTicket = async (req, res) => {
  const ticket = await prisma.ticket.findFirst({
    where: { statut: "EN_COURS" },
    orderBy: { heureAppel: "desc" }
  });
  
  if (ticket) {
      res.json({ numero: ticket.numero });
  } else {
      res.json({ numero: "--" });
  }
};

exports.getQueue = async (req, res) => {
  const queue = await prisma.ticket.findMany({
    where: { statut: "EN_ATTENTE" },
    orderBy: [{ priorite: "desc" }, { heureCreation: "asc" }]
  });
  res.json(queue);
};

exports.getQueueInfo = async (req, res) => {
  try {
    const ticketId = req.query.ticketId ? Number(req.query.ticketId) : null;

    const totalInQueue = await prisma.ticket.count({
      where: { statut: "EN_ATTENTE" }
    });

    let peopleAhead = null;

    if (ticketId) {
      // Find the user's ticket
      const userTicket = await prisma.ticket.findUnique({
        where: { id: ticketId }
      });

      if (userTicket && userTicket.statut === "EN_ATTENTE") {
        // Count tickets that are ahead in the queue:
        // Higher priority, OR same priority but created earlier
        peopleAhead = await prisma.ticket.count({
          where: {
            statut: "EN_ATTENTE",
            id: { not: userTicket.id },
            OR: [
              { priorite: { gt: userTicket.priorite } },
              {
                priorite: userTicket.priorite,
                heureCreation: { lt: userTicket.heureCreation }
              }
            ]
          }
        });
      } else if (userTicket && userTicket.statut === "EN_COURS") {
        peopleAhead = 0; // Already being served
      }
    }

    res.json({ totalInQueue, peopleAhead });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.setPriority = async (req, res) => {
  try {
    const { ticketId, priority } = req.body;
    const updated = await prisma.ticket.update({
      where: { id: ticketId },
      data: { priorite: priority }
    });
    req.io.emit("queueUpdated");
    res.json(updated);
  } catch (e) {
    res.status(500).json({ error: "Failed to set priority" });
  }
};

exports.getStats = async (req, res) => {
  const { start, end } = getAlgiersDayBoundsUtc();
  const total = await prisma.ticket.count({
    where: { heureCreation: { gte: start, lt: end } }
  });
  const waiting = await prisma.ticket.count({ where: { statut: "EN_ATTENTE" } });
  const todayServed = await prisma.ticket.count({
    where: { statut: "TERMINE", heureCreation: { gte: start, lt: end } }
  });

  const done = await prisma.ticket.findMany({
    where: {
      statut: "TERMINE",
      heureFin: { not: null },
      heureAppel: { not: null },
      heureCreation: { gte: start, lt: end }
    },
    select: { heureAppel: true, heureFin: true }
  });
  
  let avgHandling = 3;
  if (done.length > 0) {
    const totalMs = done.reduce((acc, t) => acc + (new Date(t.heureFin) - new Date(t.heureAppel)), 0);
    avgHandling = Math.ceil(totalMs / done.length / 60000);
  }
  const estimatedWaitMinutes = waiting * avgHandling;

  res.json({ total, waiting, served: todayServed, todayServed, avgHandling, estimatedWaitMinutes });
};

exports.getDetailedStats = async (req, res) => {
  const { startDate, endDate } = req.query;
  
  let dateFilter = {};
  if (startDate || endDate) {
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) {
      const eod = new Date(endDate);
      eod.setHours(23, 59, 59, 999);
      dateFilter.lte = eod;
    }
  } else {
    const { start, end } = getAlgiersDayBoundsUtc();
    dateFilter.gte = start;
    dateFilter.lt = end;
  }

  const allTickets = await prisma.ticket.findMany({
    where: { heureCreation: dateFilter }
  });

  // Hourly distribution (0-23)
  const byHour = Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    count: allTickets.filter(t => getAlgiersHour(t.heureCreation) === h).length
  }));

  // Average handling time from completed tickets
  const done = allTickets.filter(t => t.statut === "TERMINE" && t.heureAppel && t.heureFin);
  const avgHandlingMs = done.length
    ? done.reduce((acc, t) => acc + (new Date(t.heureFin) - new Date(t.heureAppel)), 0) / done.length
    : 0;
  const avgHandlingMin = Math.round(avgHandlingMs / 60000);

  // Peak hour
  const peakHour = byHour.reduce((max, h) => h.count > max.count ? h : max, { hour: 0, count: 0 });

  const completionRate = allTickets.length
    ? Math.round((done.length / allTickets.length) * 100)
    : 0;

  const byStatus = [
    { name: "Waiting", value: allTickets.filter(t => t.statut === "EN_ATTENTE").length },
    { name: "In Progress", value: allTickets.filter(t => t.statut === "EN_COURS").length },
    { name: "Served", value: allTickets.filter(t => t.statut === "TERMINE").length }
  ];

  res.json({
    total: allTickets.length,
    waiting: allTickets.filter(t => t.statut === "EN_ATTENTE").length,
    served: done.length,
    avgHandlingMin,
    completionRate,
    peakHour,
    byHour,
    byStatus
  });
};