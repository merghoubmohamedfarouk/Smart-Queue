import { useEffect, useState } from "react";
import { Container, Row, Col, Card, Button, Modal, Toast, ToastContainer, Alert } from "react-bootstrap";
import { motion, AnimatePresence } from "framer-motion";
import socket from "../services/socket";
import API from "../services/api";
import { useNotification, requestNotificationPermission } from "../components/NotificationProvider";

export default function Home() {
  const [current, setCurrent] = useState(null);
  const [businessName, setBusinessName] = useState("Smart Queue");
  const [showModal, setShowModal] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [toast, setToast] = useState({ show: false, message: "", variant: "success" });
  const [queueInfo, setQueueInfo] = useState({ totalInQueue: 0, peopleAhead: null });
  const [notifPermission, setNotifPermission] = useState(
    "Notification" in window ? Notification.permission : "denied"
  );

  // Use the global notification context for ticket tracking
  const { myTicket, saveMyTicket, notifyBefore, setNotifyBefore } = useNotification();

  const fetchCurrent = async () => {
    try {
      const res = await API.get("/tickets/current");
      if (res.data && res.data.numero !== "--") {
        setCurrent(res.data);
      } else {
        setCurrent(null);
      }
    } catch (e) {}
  };

  const fetchQueueInfo = async (ticketId) => {
    try {
      const url = ticketId
        ? `/tickets/queue-info?ticketId=${ticketId}`
        : "/tickets/queue-info";
      const res = await API.get(url);
      setQueueInfo(res.data);
    } catch (e) {}
  };

  // Fetch queue info whenever myTicket changes
  useEffect(() => {
    fetchQueueInfo(myTicket?.id);
  }, [myTicket]);

  useEffect(() => {
    fetchCurrent();
    fetchQueueInfo(myTicket?.id);
    API.get("/config").then(res => {
      if (res.data) setBusinessName(res.data.businessName);
    }).catch(()=>{});

    socket.on("callTicket", (data) => {
      if (data) {
        setCurrent(data);
      } else {
        setCurrent(null);
      }
    });

    socket.on("ticketServed", () => {
      fetchCurrent();
    });

    // Real-time queue info updates
    socket.on("queueInfoUpdated", () => {
      fetchQueueInfo(myTicket?.id);
    });

    socket.on("newTicket", () => {
      fetchQueueInfo(myTicket?.id);
    });

    return () => {
      socket.off("callTicket");
      socket.off("ticketServed");
      socket.off("queueInfoUpdated");
      socket.off("newTicket");
    };
  }, [myTicket]);

  const handleGetTicket = async () => {
    try {
      const res = await API.post("/tickets/create", {});
      saveMyTicket(res.data);
      setShowModal(true);
    } catch(e) {
      alert("Failed to get ticket!");
    }
  };

  const requestLeaveQueue = () => {
    if (!myTicket?.id || cancelling) return;
    setShowCancelConfirm(true);
  };

  const handleLeaveQueue = async () => {
    if (!myTicket?.id) return;

    setCancelling(true);
    try {
      await API.delete(`/tickets/${myTicket.id}/cancel`);
      saveMyTicket(null);
      setShowModal(false);
      setShowCancelConfirm(false);
      setToast({ show: true, message: "Your ticket was cancelled successfully.", variant: "success" });
    } catch (e) {
      const message = e?.response?.data?.error || "Unable to cancel this ticket.";
      setToast({ show: true, message, variant: "danger" });
    } finally {
      setCancelling(false);
    }
  };

  const printTicket = () => {
    window.print();
  };

  const handleEnableNotifications = async () => {
    const granted = await requestNotificationPermission();
    setNotifPermission(granted ? "granted" : "denied");
  };

  return (
    <div className="min-vh-100 bg-body d-flex flex-column">
      <Container className="my-5 flex-grow-1 d-flex flex-column">

        {/* Active Ticket Banner */}
        {myTicket && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4"
          >
            <Alert
              variant="info"
              className="d-flex align-items-center justify-content-between flex-wrap gap-3 rounded-4 shadow-sm border-0 active-ticket-banner"
            >
              <div className="d-flex align-items-center gap-3 flex-grow-1">
                <div className="active-ticket-pulse">
                  <i className="bi bi-ticket-perforated-fill fs-4"></i>
                </div>
                <div className="flex-grow-1">
                  <strong className="d-block">Your Active Ticket: #{myTicket.numero}</strong>
                  <small className="opacity-75">
                    You'll be notified when your number is called
                    {notifPermission === "granted" && (
                      <span className="ms-2">
                        <i className="bi bi-bell-fill text-success"></i> Notifications enabled
                      </span>
                    )}
                  </small>
                  {/* Real-time queue stats */}
                  <div className="queue-info-strip mt-2 d-flex gap-3 flex-wrap align-items-center">
                    <div className="queue-info-chip">
                      <i className="bi bi-people-fill"></i>
                      <span>{queueInfo.totalInQueue} in queue</span>
                    </div>
                    {queueInfo.peopleAhead !== null && (
                      <div className="queue-info-chip">
                        <i className="bi bi-arrow-up-circle-fill"></i>
                        <span>{queueInfo.peopleAhead} ahead of you</span>
                      </div>
                    )}
                    <div className="notify-threshold-chip" title="Notify me when this many people are ahead">
                      <i className="bi bi-bell-fill"></i>
                      <button
                        className="notify-stepper-btn"
                        onClick={() => setNotifyBefore(notifyBefore - 1)}
                        disabled={notifyBefore <= 1}
                        aria-label="Decrease notification threshold"
                      >
                        <i className="bi bi-dash"></i>
                      </button>
                      <span className="notify-stepper-value">{notifyBefore}</span>
                      <button
                        className="notify-stepper-btn"
                        onClick={() => setNotifyBefore(notifyBefore + 1)}
                        disabled={notifyBefore >= 99}
                        aria-label="Increase notification threshold"
                      >
                        <i className="bi bi-plus"></i>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="d-flex gap-2 flex-wrap">
                {notifPermission === "default" && (
                  <Button
                    variant="outline-primary"
                    size="sm"
                    className="rounded-pill px-3"
                    onClick={handleEnableNotifications}
                  >
                    <i className="bi bi-bell me-1"></i>
                    Enable Notifications
                  </Button>
                )}
                {notifPermission === "denied" && (
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    className="rounded-pill px-3"
                    disabled
                  >
                    <i className="bi bi-bell-slash me-1"></i>
                    Notifications Blocked
                  </Button>
                )}
                <Button
                  variant="outline-info"
                  size="sm"
                  className="rounded-pill px-3"
                  onClick={() => setShowModal(true)}
                >
                  <i className="bi bi-eye me-1"></i> View Ticket
                </Button>
                <Button
                  variant="outline-danger"
                  size="sm"
                  className="rounded-pill px-3"
                  onClick={requestLeaveQueue}
                  disabled={cancelling}
                >
                  <i className="bi bi-x-circle me-1"></i> Leave Queue
                </Button>
              </div>
            </Alert>
          </motion.div>
        )}

        <Row className="g-4 flex-grow-1 align-items-stretch">
          {/* LEFT: Get Ticket */}
          <Col lg={5} className="d-flex flex-column">
            <Card
              className="border-0 shadow-lg rounded-4 flex-grow-1 overflow-hidden"
              style={{
                background: "linear-gradient(160deg, #ffffff 0%, #f7faff 100%)",
              }}
            >
              <div
                className="text-muted fw-bold text-uppercase py-3 px-4 border-bottom d-flex align-items-center justify-content-between"
                style={{
                  backgroundColor: "rgba(13, 110, 253, 0.05)",
                }}
              >
                <div className="d-flex align-items-center gap-2">
                  <i className="bi bi-ticket-perforated text-primary"></i>
                  <span>Get Ticket</span>
                </div>
                <span className="badge rounded-pill text-bg-light text-primary px-3 py-2">
                  Quick
                </span>
              </div>
              <Card.Body className="p-4 p-md-5 d-flex align-items-center justify-content-center text-center flex-column">
                <h2 className="fw-bold mb-2">{businessName}</h2>
                <p className="text-muted mb-4" style={{ maxWidth: "26rem" }}>
                  Take your ticket and wait for your number to appear on the display board.
                </p>
                <Button
                  variant="primary"
                  size="lg"
                  className="rounded-pill px-4 px-md-5 py-3 fw-bold shadow-sm"
                  style={{
                    fontSize: "clamp(1rem, 2.6vw, 1.2rem)",
                    letterSpacing: "0.02em",
                  }}
                  onClick={handleGetTicket}
                  disabled={!!myTicket}
                >
                  <i className="bi bi-ticket-perforated-fill me-2"></i>
                  {myTicket ? "TICKET ACTIVE" : "GET A TICKET"}
                </Button>
                <small className="text-muted mt-3">
                  {myTicket
                    ? `You already have ticket #${myTicket.numero}`
                    : "It only takes a second"}
                </small>
              </Card.Body>
            </Card>
          </Col>

          {/* RIGHT: Display Board */}
          <Col lg={7} className="d-flex flex-column">
            <Card
              className="border-0 shadow-lg rounded-4 flex-grow-1 overflow-hidden"
              style={{
                background: "linear-gradient(145deg, #0b3fa6 0%, #0d6efd 58%, #0dcaf0 100%)",
                color: "white",
              }}
            >
              <div
                className="fw-bold text-uppercase py-3 px-4 border-bottom d-flex justify-content-between align-items-center"
                style={{
                  backgroundColor: "rgba(255,255,255,0.14)",
                  backdropFilter: "blur(2px)",
                }}
              >
                <div className="d-flex align-items-center gap-2">
                  <i className="bi bi-display"></i>
                  <span>Display Board</span>
                </div>
                <span className="badge rounded-pill text-bg-light text-primary px-3 py-2">
                  Live
                </span>
              </div>
              <Card.Body className="p-4 p-md-5 d-flex align-items-center justify-content-center text-center flex-column">
                <p className="mb-2 text-uppercase fw-semibold opacity-75 small">
                  Now Serving
                </p>
                <AnimatePresence mode="wait">
                  {current ? (
                    <motion.div
                      key={current.numero}
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.9, opacity: 0 }}
                      className="w-100"
                    >
                      <h1
                        className="fw-bold m-0 pb-2"
                        style={{
                          fontSize: "clamp(4.5rem, 14vw, 10.5rem)",
                          lineHeight: 1,
                          letterSpacing: "0.04em",
                          textShadow: "0 8px 18px rgba(0,0,0,0.28)",
                        }}
                      >
                        #{current.numero}
                      </h1>
                      <p className="mb-0 opacity-75">Please proceed to the counter</p>
                    </motion.div>
                  ) : (
                    <motion.h3
                      key="empty"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-white opacity-75 fw-normal"
                      style={{ fontSize: "clamp(1.5rem, 4.2vw, 2.3rem)" }}
                    >
                      Waiting for the next client...
                    </motion.h3>
                  )}
                </AnimatePresence>
              </Card.Body>
            </Card>
          </Col>

        </Row>
      </Container>

      {/* Ticket Modal */}
      <Modal show={showModal} onHide={() => { setShowModal(false); }} centered backdrop="static" className="print-modal">
        <Modal.Header closeButton className="border-0 pb-0"></Modal.Header>
        <Modal.Body className="text-center pb-5 pt-0 px-5">
          <div id="ticket-print-area" className="bg-white shadow-sm p-4 mb-4">
            <div style={{ maxWidth: "360px", margin: "0 auto", fontFamily: "monospace", border: "1px dashed #6c757d", padding: "18px" }}>
              <h5 className="mb-1 fw-bold text-uppercase">{businessName}</h5>
              <div className="small text-muted mb-3">Queue Ticket</div>
              <div style={{ borderTop: "1px dashed #bbb", marginBottom: "12px" }}></div>
              <div className="small text-muted">Ticket Number</div>
              <div className="fw-bold text-dark" style={{ fontSize: "3.4rem", lineHeight: 1.05 }}>
                #{myTicket?.numero}
              </div>
              <div className="small mt-2">Date: {myTicket && new Date(myTicket.heureCreation).toLocaleDateString()}</div>
              <div className="small">Time: {myTicket && new Date(myTicket.heureCreation).toLocaleTimeString()}</div>
              <div style={{ borderTop: "1px dashed #bbb", margin: "12px 0" }}></div>

              {/* Queue position info inside ticket */}
              <div className="queue-info-ticket my-2">
                <div className="d-flex justify-content-around text-center">
                  <div>
                    <div className="fw-bold text-primary" style={{ fontSize: "1.5rem" }}>{queueInfo.totalInQueue}</div>
                    <div className="small text-muted">In Queue</div>
                  </div>
                  {queueInfo.peopleAhead !== null && (
                    <div>
                      <div className="fw-bold text-warning" style={{ fontSize: "1.5rem" }}>{queueInfo.peopleAhead}</div>
                      <div className="small text-muted">Ahead of You</div>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ borderTop: "1px dashed #bbb", margin: "12px 0" }}></div>
              <div className="small fw-bold">Please wait for your number to be called.</div>
              <div className="small text-muted mt-1">
                <i className="bi bi-bell-fill text-primary me-1"></i>
                You'll receive a notification when it's your turn.
              </div>

              {/* Notification threshold control inside ticket */}
              <div className="notify-threshold-control mt-3">
                <div className="small text-muted mb-2">
                  <i className="bi bi-gear-fill me-1"></i>
                  Notify me when there are this many people ahead:
                </div>
                <div className="d-flex align-items-center justify-content-center gap-2">
                  <button
                    className="notify-modal-btn"
                    onClick={() => setNotifyBefore(notifyBefore - 1)}
                    disabled={notifyBefore <= 1}
                    aria-label="Decrease"
                  >
                    <i className="bi bi-dash-lg"></i>
                  </button>
                  <div className="notify-modal-value">{notifyBefore}</div>
                  <button
                    className="notify-modal-btn"
                    onClick={() => setNotifyBefore(notifyBefore + 1)}
                    disabled={notifyBefore >= 99}
                    aria-label="Increase"
                  >
                    <i className="bi bi-plus-lg"></i>
                  </button>
                </div>
                <div className="small text-muted mt-1" style={{ fontSize: "0.72rem" }}>
                  {notifyBefore === 1
                    ? "You'll be notified when 1 person is ahead"
                    : `You'll be notified when ${notifyBefore} people are ahead`}
                </div>
              </div>
            </div>
          </div>
           
          {notifPermission === "default" && (
            <div className="mb-3">
              <Button
                variant="outline-primary"
                size="sm"
                className="rounded-pill px-4"
                onClick={handleEnableNotifications}
              >
                <i className="bi bi-bell me-2"></i>
                Enable Push Notifications
              </Button>
              <div className="small text-muted mt-1">Get notified when your ticket is called</div>
            </div>
          )}
          {notifPermission === "denied" && (
            <div className="mb-3">
              <Button
                variant="outline-secondary"
                size="sm"
                className="rounded-pill px-4"
                disabled
              >
                <i className="bi bi-bell-slash me-2"></i>
                Notifications Blocked
              </Button>
              <div className="small text-danger mt-1">Please allow notifications in your browser settings.</div>
            </div>
          )}

          <div className="d-flex gap-3 d-print-none">
            <Button variant="secondary" className="w-100" onClick={() => { setShowModal(false); }}>Close</Button>
            <Button variant="primary" className="w-100" onClick={printTicket}><i className="bi bi-printer-fill me-2"></i> Print</Button>
            <Button variant="outline-danger" className="w-100" onClick={requestLeaveQueue} disabled={cancelling}>
              {cancelling ? "Cancelling..." : "Leave Queue"}
            </Button>
          </div>
        </Modal.Body>
      </Modal>

      <Modal show={showCancelConfirm} onHide={() => setShowCancelConfirm(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Leave Queue</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to leave the queue? Your current ticket will be deleted.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowCancelConfirm(false)} disabled={cancelling}>
            Keep My Ticket
          </Button>
          <Button variant="danger" onClick={handleLeaveQueue} disabled={cancelling}>
            {cancelling ? "Cancelling..." : "Yes, Leave Queue"}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Inline styles for printing the ticket and hiding the rest */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #ticket-print-area, #ticket-print-area * { visibility: visible; }
          #ticket-print-area { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none !important; }
        }
      `}</style>

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
              <i className={`bi ${toast.variant === "success" ? "bi-check-circle-fill text-success" : "bi-exclamation-triangle-fill text-warning"}`}></i>
              {toast.variant === "success" ? "Success" : "Notice"}
            </strong>
          </Toast.Header>
          <Toast.Body className={toast.variant === "danger" ? "text-white" : ""}>
            {toast.message}
          </Toast.Body>
        </Toast>
      </ToastContainer>
    </div>
  );
}
