import { useState, useEffect } from "react";
import { Container, Row, Col, Card, Badge, Table, Toast, ToastContainer } from "react-bootstrap";
import { motion, AnimatePresence } from "framer-motion";
import API from "../services/api";
import socket from "../services/socket";
import AppButton from "../components/Button";

export default function AdminDashboard() {
  const [stats, setStats] = useState({ total: 0, waiting: 0, served: 0 });
  const [activeTicket, setActiveTicket] = useState(null);
  const [loading, setLoading] = useState(false);
  const [queue, setQueue] = useState([]);
  const [businessName, setBusinessName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [toast, setToast] = useState({ show: false, message: "", variant: "success", title: "Notice" });

  const fetchStats = async () => {
    try {
      const res = await API.get("/tickets/stats");
      setStats(res.data);
    } catch (e) { }
  };

  const fetchQueue = async () => {
    try {
      const res = await API.get(`/tickets/queue`);
      setQueue(res.data);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    const init = async () => {
      fetchStats();
      fetchQueue();

      try {
        const res = await API.get("/tickets/current");
        if (res.data && res.data.numero !== "--") setActiveTicket(res.data);
      } catch (e) {}
      try {
        const configRes = await API.get("/config");
        setBusinessName(configRes?.data?.businessName || "");
      } catch (e) {}
    };
    init();

    socket.on("newTicket", () => { fetchStats(); fetchQueue(); });
    socket.on("callTicket", (ticket) => { fetchStats(); setActiveTicket(ticket); fetchQueue(); });
    socket.on("ticketServed", () => { fetchStats(); });
    socket.on("queueUpdated", () => { fetchQueue(); });

    return () => {
      socket.off("newTicket");
      socket.off("callTicket");
      socket.off("ticketServed");
      socket.off("queueUpdated");
    };
  }, []);

  const handleCallNext = async () => {
    setLoading(true);
    try {
      const res = await API.post("/tickets/call", {});
      if (res.data.message) {
         setToast({ show: true, message: "Queue is empty.", variant: "warning", title: "Queue" });
      }
      fetchQueue();
      fetchStats();
    } catch (e) {
      setToast({ show: true, message: "Error calling next ticket.", variant: "danger", title: "Error" });
    }
    finally { setLoading(false); }
  };

  const cyclePriority = async (ticket) => {
    const nextPriority = (ticket.priorite + 1) % 3;
    try {
      await API.patch("/tickets/priority", { ticketId: ticket.id, priority: nextPriority });
      fetchQueue();
    } catch (e) { }
  };

  const priorityMeta = (value) => {
    if (value === 2) return { label: "Urgent", variant: "danger" };
    if (value === 1) return { label: "Priority", variant: "warning" };
    return { label: "Normal", variant: "secondary" };
  };

  const saveBusinessName = async () => {
    if (!businessName.trim()) return;
    setSavingName(true);
    try {
      await API.put("/config", { businessName: businessName.trim() });
      setToast({ show: true, message: "Queue name updated successfully.", variant: "success", title: "Success" });
    } catch (e) {
      setToast({ show: true, message: "Failed to update queue name.", variant: "danger", title: "Error" });
    } finally {
      setSavingName(false);
    }
  };

  return (
    <div className="min-vh-100 bg-body pb-5">
      {/* Header */}
      <div className="bg-dark text-white py-4 shadow-sm mb-4 mb-md-5">
        <Container>
          <h2 className="mb-0 fw-bold fs-3 fs-md-2">
            <i className="bi bi-shield-lock-fill me-3 text-primary"></i> Admin Dashboard
          </h2>
        </Container>
      </div>

      <Container>
        {/* Stats Row */}
        <Row className="g-4 mb-4">
          <Col md={4}>
             <Card className="border-0 shadow-sm rounded-4 h-100 bg-primary text-white">
              <Card.Body className="p-4 d-flex align-items-center justify-content-between">
                <div>
                  <p className="mb-1 text-uppercase fw-bold opacity-75">Today Served</p>
                  <h2 className="fw-bold mb-0" style={{ fontSize: "clamp(2rem, 4.5vw, 3.3rem)" }}>{stats.todayServed ?? stats.served}</h2>
                </div>
                <i className="bi bi-people-fill opacity-50" style={{ fontSize: "4rem" }}></i>
              </Card.Body>
            </Card>
          </Col>
          <Col md={4}>
             <Card className="border-0 shadow-sm rounded-4 h-100 bg-warning text-dark">
              <Card.Body className="p-4 d-flex align-items-center justify-content-between">
                <div>
                  <p className="mb-1 text-uppercase fw-bold opacity-75">Waiting</p>
                  <h2 className="fw-bold mb-0" style={{ fontSize: "clamp(2rem, 4.5vw, 3.3rem)" }}>{stats.waiting}</h2>
                </div>
                <i className="bi bi-hourglass-split opacity-50" style={{ fontSize: "4rem" }}></i>
              </Card.Body>
            </Card>
          </Col>
          <Col md={4}>
             <Card className="border-0 shadow-sm rounded-4 h-100 bg-success text-white">
              <Card.Body className="p-4 d-flex align-items-center justify-content-between">
                <div>
                  <p className="mb-1 text-uppercase fw-bold opacity-75">Today Tickets</p>
                  <h2 className="fw-bold mb-0" style={{ fontSize: "clamp(2rem, 4.5vw, 3.3rem)" }}>{stats.total}</h2>
                </div>
                <i className="bi bi-check2-all opacity-50" style={{ fontSize: "4rem" }}></i>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        <Row className="g-4 mb-4">
          <Col>
            <Card className="border-0 shadow-sm rounded-4">
              <Card.Body className="p-4 d-flex flex-wrap align-items-center gap-3">
                <div className="fw-bold text-uppercase text-muted">Queue Display Name</div>
                <input
                  className="form-control"
                  style={{ maxWidth: "360px" }}
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Ex: Dr Benali Cabinet"
                />
                <button className="btn btn-primary" onClick={saveBusinessName} disabled={savingName}>
                  {savingName ? "Saving..." : "Save Name"}
                </button>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        <Row className="g-4">
          {/* Action Panel */}
          <Col lg={5}>
             <Card className="border-0 shadow-lg h-100" style={{ borderRadius: "2rem", overflow: "hidden" }}>
              <div className="bg-body-tertiary p-4 border-bottom text-center">
                <h5 className="mb-0 fw-bold">Queue Controller</h5>
              </div>
              
              <Card.Body className="p-5 text-center bg-body d-flex flex-column justify-content-between">
                <div>
                  <p className="text-uppercase text-muted fw-bold mb-2">Active Ticket</p>
                  <div className="mb-3 d-flex justify-content-center">
                    <span className="status-chip status-progress">In Progress</span>
                  </div>
                   <AnimatePresence mode="popLayout">
                    <motion.div key={activeTicket ? activeTicket.id : "empty"}
                      initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }} transition={{ type: "spring", stiffness: 200, damping: 20 }}
                      className="my-4">
                      {activeTicket ? (
                        <div>
                          <h1 className="fw-bold text-primary" style={{ fontSize: "clamp(3rem, 9vw, 6rem)", lineHeight: "1" }}>#{activeTicket.numero}</h1>
                        </div>
                      ) : (
                        <div className="py-3 opacity-50">
                           <h5 className="text-muted fw-bold mb-0" style={{ fontSize:"clamp(1.7rem, 6vw, 3rem)" }}>--</h5>
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>
                 
                 <AppButton variant="primary" size="lg" onClick={handleCallNext}
                    disabled={loading}
                    className="w-100 py-3 py-md-4 fw-bold shadow-lg d-flex justify-content-center align-items-center gap-2 gap-md-3"
                    style={{ borderRadius: "1.5rem", background: "linear-gradient(135deg, #0d6efd 0%, #0a58ca 100%)" }}>
                    {loading
                      ? <span className="spinner-border" style={{ width: "2rem", height: "2rem" }}></span>
                      : <>
                          <i className="bi bi-megaphone-fill"></i>
                          <span className="text-wrap" style={{ fontSize: "clamp(0.95rem, 2.8vw, 1.5rem)" }}>MARK SERVED & CALL NEXT</span>
                        </>}
                 </AppButton>
              </Card.Body>
            </Card>
          </Col>

          {/* Live Queue */}
          <Col lg={7}>
            <Card className="border-0 shadow-lg h-100" style={{ borderRadius: "2rem", overflow: "hidden" }}>
               <div className="bg-body-tertiary p-4 border-bottom d-flex justify-content-between align-items-center">
                <h5 className="mb-0 fw-bold">
                  <i className="bi bi-list-ol me-2 text-primary"></i>
                  Live Queue
                </h5>
                <Badge bg="primary" className="rounded-pill px-3 py-2 fs-6">{queue.length} waiting</Badge>
              </div>
              <Card.Body className="p-0 bg-body overflow-auto" style={{ maxHeight: "60vh" }}>
                {queue.length === 0 ? (
                  <div className="text-center py-5 text-muted opacity-50">
                    <h5 className="mt-4">Queue is empty</h5>
                  </div>
                ) : (
                  <div className="table-responsive">
                  <Table borderless hover className="align-middle mb-0">
                    <thead className="bg-body-tertiary border-bottom text-muted fast-uppercase">
                      <tr>
                        <th className="ps-4">No.</th>
                        <th>Ticket</th>
                        <th>Wait Time</th>
                        <th className="pe-4 text-end">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      <AnimatePresence mode="popLayout">
                        {queue.map((t, idx) => {
                          const waitMs = Date.now() - new Date(t.heureCreation).getTime();
                          const waitMin = Math.floor(waitMs / 60000);
                          const { label, variant } = priorityMeta(t.priorite);
                          return (
                            <motion.tr key={t.id}
                              layout
                              initial={{ opacity: 0, y: 10, scale: 0.99 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: -8, scale: 0.99 }}
                              transition={{ duration: 0.2, ease: "easeOut" }}
                              className={`border-bottom ${t.priorite > 0 ? "bg-warning bg-opacity-10" : ""}`}
                            >
                               <td className="ps-4 py-3">
                                 <Badge bg="secondary" className="rounded-circle p-2 fs-6">{idx + 1}</Badge>
                               </td>
                               <td className="fw-bold fs-4">#{t.numero}</td>
                               <td className="text-muted">{waitMin > 0 ? `${waitMin}m ago` : "Just now"}</td>
                               <td className="pe-4 text-end">
                                 <button
                                  className={`btn btn-${variant} btn-sm px-3 rounded-pill fw-bold`}
                                  onClick={() => cyclePriority(t)}
                                  title="Cycle priority: Normal > Priority > Urgent">
                                  {label}
                                 </button>
                               </td>
                            </motion.tr>
                          );
                        })}
                      </AnimatePresence>
                    </tbody>
                  </Table>
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>

      <ToastContainer position="bottom-end" className="p-3" style={{ zIndex: 1080 }}>
        <Toast
          onClose={() => setToast((prev) => ({ ...prev, show: false }))}
          show={toast.show}
          delay={2600}
          autohide
          bg={toast.variant}
        >
          <Toast.Header closeButton>
            <strong className="me-auto d-flex align-items-center gap-2">
              <i
                className={`bi ${
                  toast.variant === "success"
                    ? "bi-check-circle-fill text-success"
                    : toast.variant === "warning"
                      ? "bi-exclamation-circle-fill text-warning"
                      : "bi-exclamation-triangle-fill text-danger"
                }`}
              ></i>
              {toast.title}
            </strong>
          </Toast.Header>
          <Toast.Body
            className={toast.variant === "danger" ? "text-white" : ""}
          >
            {toast.message}
          </Toast.Body>
        </Toast>
      </ToastContainer>
    </div>
  );
}
