import { useState, useEffect } from "react";
import Navbar from "react-bootstrap/Navbar";
import Nav from "react-bootstrap/Nav";
import Container from "react-bootstrap/Container";
import Button from "react-bootstrap/Button";
import { Link } from "react-router-dom";
import API from "../services/api";

export default function AppNavbar() {
  const [theme, setTheme] = useState("light");
  const [businessName, setBusinessName] = useState("Smart Queue");
  const token = localStorage.getItem("token");
  const isAuthenticated = !!token;

  useEffect(() => {
    document.documentElement.setAttribute("data-bs-theme", theme);
    // Fetch business name
    API.get("/config").then(res => {
      if (res.data && res.data.businessName) {
        setBusinessName(res.data.businessName);
      }
    }).catch(() => {});
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.href = "/";
  };

  return (
    <Navbar bg={theme === "light" ? "light" : "dark"} variant={theme} expand="lg" className="shadow-sm">
      <Container fluid="lg">
        <Navbar.Brand
          as={Link}
          to={isAuthenticated ? "/admin" : "/"}
          className="fw-bold text-primary text-truncate"
          style={{ maxWidth: "70vw" }}
        >
          <i className={`bi ${isAuthenticated ? "bi-shield-lock-fill" : "bi-display"} me-2`}></i>
          {isAuthenticated ? "Admin Panel" : businessName}
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            {isAuthenticated && (
              <>
                <Nav.Link as={Link} to="/admin">
                  <i className="bi bi-speedometer2 me-1"></i>Dashboard
                </Nav.Link>
                <Nav.Link as={Link} to="/stats">
                  <i className="bi bi-bar-chart-line me-1"></i>Statistics
                </Nav.Link>
              </>
            )}
          </Nav>
          <div className="d-flex align-items-center gap-2 gap-sm-3 flex-wrap mt-3 mt-lg-0">
            <Button variant={theme === "light" ? "outline-dark" : "outline-light"} size="sm" onClick={toggleTheme}>
              {theme === "light" ? <i className="bi bi-moon-stars-fill"></i> : <i className="bi bi-sun-fill"></i>}
            </Button>
            {isAuthenticated ? (
              <Button variant="danger" size="sm" onClick={handleLogout}>
                <i className="bi bi-box-arrow-right me-1"></i> Logout
              </Button>
            ) : (
              <Button as={Link} to="/login" variant="primary" size="sm" className="rounded-pill px-3">
                <i className="bi bi-shield-lock me-1"></i> Admin Login
              </Button>
            )}
          </div>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}