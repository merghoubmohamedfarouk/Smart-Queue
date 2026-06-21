const router = require("express").Router();
const ctrl = require("../controllers/ticket.controller");
const auth = require("../middlewares/auth.middleware");

// Public routes for clients walking in
router.post("/create", ctrl.createTicket);
router.delete("/:id/cancel", ctrl.cancelTicket);
router.get("/current", ctrl.getCurrentTicket);

// Public route to view the live queue waiting list
router.get("/queue", ctrl.getQueue); 

// Public route for real-time queue info (total in queue + people ahead)
router.get("/queue-info", ctrl.getQueueInfo);

// Admin only routes
// Single endpoint marks current as done and calls next
router.post("/call", auth, ctrl.callNext);
router.patch("/priority", auth, ctrl.setPriority);
router.get("/stats/detailed", auth, ctrl.getDetailedStats);
router.get("/stats", auth, ctrl.getStats);

module.exports = router;