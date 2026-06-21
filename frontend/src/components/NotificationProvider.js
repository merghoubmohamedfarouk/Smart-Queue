import { useEffect, useState, useCallback, useRef, createContext, useContext } from "react";
import { Toast, ToastContainer } from "react-bootstrap";
import { AnimatePresence, motion } from "framer-motion";
import socket from "../services/socket";
import API from "../services/api";

const NotificationContext = createContext();

export const useNotification = () => useContext(NotificationContext);

/**
 * Requests the browser Notification permission if not already granted.
 * Returns true if permission is granted.
 */
export function requestNotificationPermission() {
  if (!("Notification" in window)) return Promise.resolve(false);
  if (Notification.permission === "granted") return Promise.resolve(true);
  if (Notification.permission === "denied") return Promise.resolve(false);
  return Notification.requestPermission().then((p) => p === "granted");
}

/**
 * Sends a native browser push notification.
 */
function sendBrowserNotification(title, body, tag) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  try {
    const notif = new Notification(title, {
      body,
      icon: "/logo192.png",
      badge: "/logo192.png",
      tag: tag || "queue-notification",
      requireInteraction: true,
      vibrate: [200, 100, 200, 100, 200],
    });
    notif.onclick = () => {
      window.focus();
      notif.close();
    };
  } catch (e) {
    // Silent fail for environments that don't support Notification constructor
  }
}

export default function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [myTicket, setMyTicket] = useState(() => {
    try {
      const stored = localStorage.getItem("myTicket");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  // Notification threshold: notify when this many people are ahead
  const [notifyBefore, setNotifyBeforeState] = useState(() => {
    try {
      const stored = localStorage.getItem("notifyBefore");
      return stored ? Math.max(1, parseInt(stored, 10)) : 1;
    } catch {
      return 1;
    }
  });

  // Track whether we already fired the "approaching" notification for the current threshold
  const approachNotifiedRef = useRef(false);

  const setNotifyBefore = useCallback((value) => {
    const clamped = Math.max(1, Math.min(99, value));
    setNotifyBeforeState(clamped);
    localStorage.setItem("notifyBefore", String(clamped));
    // Reset the flag when the user changes the threshold
    approachNotifiedRef.current = false;
  }, []);

  // Persist ticket to localStorage
  const saveMyTicket = useCallback((ticket) => {
    setMyTicket(ticket);
    if (ticket) {
      localStorage.setItem("myTicket", JSON.stringify(ticket));
      // Reset approach notification when getting a new ticket
      approachNotifiedRef.current = false;
    } else {
      localStorage.removeItem("myTicket");
      approachNotifiedRef.current = false;
    }
  }, []);

  const addNotification = useCallback((notification) => {
    const id = Date.now() + Math.random();
    setNotifications((prev) => [...prev, { ...notification, id }]);
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  // Listen for callTicket events and match against the customer's ticket
  useEffect(() => {
    const handleCallTicket = (data) => {
      if (!data || !myTicket) return;

      // Check if the called ticket matches the customer's ticket
      if (data.id === myTicket.id || data.numero === myTicket.numero) {
        // In-app notification
        addNotification({
          type: "called",
          title: "🎉 Your Turn!",
          message: `Ticket #${data.numero} has been called! Please proceed to the counter.`,
          variant: "success",
        });

        // Browser push notification
        sendBrowserNotification(
          "🎉 Your Turn!",
          `Ticket #${data.numero} has been called! Please proceed to the counter now.`,
          `ticket-called-${data.id}`
        );

        // Play bell sound
        try {
          new Audio("/bell.mp3").play().catch(() => {});
        } catch (e) {}

        // Clear the saved ticket since it's now being served
        saveMyTicket(null);
      }
    };

    const handleTicketCancelled = (data) => {
      if (!data || !myTicket) return;
      if (data.id === myTicket.id) {
        saveMyTicket(null);
      }
    };

    socket.on("callTicket", handleCallTicket);
    socket.on("ticketCancelled", handleTicketCancelled);

    return () => {
      socket.off("callTicket", handleCallTicket);
      socket.off("ticketCancelled", handleTicketCancelled);
    };
  }, [myTicket, addNotification, saveMyTicket]);

  // Listen for queue updates and fire "approaching" notification
  useEffect(() => {
    if (!myTicket) return;

    const checkApproaching = async () => {
      try {
        const res = await API.get(`/tickets/queue-info?ticketId=${myTicket.id}`);
        const { peopleAhead } = res.data;

        if (
          peopleAhead !== null &&
          peopleAhead !== undefined &&
          peopleAhead <= notifyBefore &&
          peopleAhead > 0 &&
          !approachNotifiedRef.current
        ) {
          approachNotifiedRef.current = true;

          addNotification({
            type: "approaching",
            title: "⏰ Almost Your Turn!",
            message:
              peopleAhead === 1
                ? `There is 1 person before you. Get ready!`
                : `There are ${peopleAhead} people before you. Get ready!`,
            variant: "warning",
          });

          sendBrowserNotification(
            "⏰ Almost Your Turn!",
            peopleAhead === 1
              ? `There is 1 person before your turn!`
              : `There are ${peopleAhead} people before your turn!`,
            `ticket-approaching-${myTicket.id}`
          );

          // Play a softer notification sound
          try {
            new Audio("/bell.mp3").play().catch(() => {});
          } catch (e) {}
        }
      } catch (e) {
        // Silently fail
      }
    };

    // Check on every queue event
    const handleQueueChange = () => checkApproaching();

    socket.on("queueInfoUpdated", handleQueueChange);
    socket.on("callTicket", handleQueueChange);
    socket.on("ticketServed", handleQueueChange);

    // Also check immediately
    checkApproaching();

    return () => {
      socket.off("queueInfoUpdated", handleQueueChange);
      socket.off("callTicket", handleQueueChange);
      socket.off("ticketServed", handleQueueChange);
    };
  }, [myTicket, notifyBefore, addNotification]);

  return (
    <NotificationContext.Provider
      value={{ myTicket, saveMyTicket, addNotification, requestNotificationPermission, notifyBefore, setNotifyBefore }}
    >
      {children}

      {/* Floating notification toasts */}
      <ToastContainer
        position="top-center"
        className="p-3"
        style={{ zIndex: 9999, pointerEvents: "none" }}
      >
        <AnimatePresence>
          {notifications.map((n) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, y: -40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              style={{ pointerEvents: "auto" }}
            >
              <Toast
                onClose={() => removeNotification(n.id)}
                show={true}
                delay={12000}
                autohide
                className={`notification-toast notification-toast-${n.type || "info"} ${n.type === "approaching" ? "notification-toast-approaching" : ""}`}
              >
                <Toast.Header
                  closeButton
                  className="notification-toast-header"
                >
                  <strong className="me-auto d-flex align-items-center gap-2">
                    <i
                      className={`bi ${
                        n.type === "called"
                          ? "bi-bell-fill"
                          : "bi-info-circle-fill"
                      }`}
                    ></i>
                    {n.title}
                  </strong>
                </Toast.Header>
                <Toast.Body className="notification-toast-body">
                  {n.message}
                </Toast.Body>
              </Toast>
            </motion.div>
          ))}
        </AnimatePresence>
      </ToastContainer>
    </NotificationContext.Provider>
  );
}
