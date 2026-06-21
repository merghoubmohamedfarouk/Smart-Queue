import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Container } from "react-bootstrap";

export default function NotFound() {
  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center text-center"
      style={{ background: "linear-gradient(135deg, #0d6efd 0%, #0dcaf0 100%)" }}>
      <Container>
        <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", bounce: 0.4 }}>
          <h1 className="text-white fw-black" style={{ fontSize: "clamp(4.5rem, 24vw, 10rem)", lineHeight: 1 }}>404</h1>
          <h2 className="text-white fw-bold mb-3">Page Not Found</h2>
          <p className="text-white opacity-75 mb-4 mb-md-5 fs-6 fs-md-5">Looks like you took a wrong turn in the queue.</p>
          <Link to="/" className="btn btn-light btn-lg fw-bold px-4 px-md-5 py-3 rounded-pill shadow">
            <i className="bi bi-house-fill me-2"></i> Back to Home
          </Link>
        </motion.div>
      </Container>
    </div>
  );
}
