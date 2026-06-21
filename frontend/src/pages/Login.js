import { useEffect, useState } from "react";
import API from "../services/api";
import { Container, Row, Col, Form, Card, Button } from "react-bootstrap";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("token")) {
      window.location.href = "/admin";
    }
  }, []);

  const login = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await API.post("/auth/login", { email, password });
      localStorage.setItem("token", res.data.token);
      
      // Single admin dashboard flow
      window.location.href = "/admin";
    } catch (e) {
      alert("Identifiants incorrects ou erreur serveur");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="min-vh-100 d-flex align-items-center justify-content-center py-4">
      <Card className="shadow-lg border-0 overflow-hidden" style={{ maxWidth: '900px', width: '100%' }}>
        <Row className="g-0">
          {/* Left panel with illustration */}
          <Col md={6} className="d-none d-md-flex bg-primary text-white flex-column justify-content-center align-items-center p-5" style={{ background: "linear-gradient(to bottom right, #0d6efd, #6610f2)" }}>
            <i className="bi bi-shield-lock-fill mb-4" style={{ fontSize: "5rem" }}></i>
            <h2 className="fw-bold text-center">Admin Portal</h2>
            <p className="text-center opacity-75 mt-3">
              Sign in to manage the queue, view statistics, and control your Smart Queue system.
            </p>
          </Col>

          {/* Right panel with form */}
          <Col md={6} className="p-4 p-md-5">
            <div className="text-center mb-4 mb-md-5">
              <h3 className="fw-bold text-body">Admin Login</h3>
              <p className="text-muted">Enter your admin credentials to access the dashboard</p>
            </div>
            
            <Form onSubmit={login}>
              <Form.Group className="mb-3 mb-md-4">
                <Form.Label className="fw-semibold text-muted small">EMAIL ADDRESS</Form.Label>
                <div className="input-group">
                  <span className="input-group-text bg-body-tertiary border-end-0"><i className="bi bi-envelope"></i></span>
                  <Form.Control 
                    type="email" 
                    className="bg-body-tertiary border-start-0 ps-0 form-control-lg"
                    placeholder="Enter your email" 
                    onChange={e => setEmail(e.target.value)} 
                    required
                  />
                </div>
              </Form.Group>
              
              <Form.Group className="mb-4 mb-md-5">
                <Form.Label className="fw-semibold text-muted small">PASSWORD</Form.Label>
                <div className="input-group">
                  <span className="input-group-text bg-body-tertiary border-end-0"><i className="bi bi-key"></i></span>
                  <Form.Control 
                    type="password" 
                    className="bg-body-tertiary border-start-0 ps-0 form-control-lg"
                    placeholder="Enter password" 
                    onChange={e => setPassword(e.target.value)} 
                    required
                  />
                </div>
              </Form.Group>
              
              <div className="d-grid gap-2 mt-4">
                <Button variant="primary" size="lg" type="submit" className="rounded-pill fw-bold" disabled={loading}>
                  {loading ? (
                    <><span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> Authenticating...</>
                  ) : (
                    "Sign In"
                  )}
                </Button>
                <Button variant="link" href="/" className="text-decoration-none text-muted mt-2">
                  <i className="bi bi-arrow-left me-1"></i> Back to Queue
                </Button>
              </div>
            </Form>
          </Col>
        </Row>
      </Card>
    </Container>
  );
}