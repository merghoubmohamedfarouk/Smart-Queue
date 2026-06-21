import { useState, useEffect } from "react";
import { Container, Row, Col, Card, ProgressBar, Spinner, Form } from "react-bootstrap";
import { motion } from "framer-motion";
import API from "../services/api";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

export default function Statistics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const normalizeBasicStats = (stats) => ({
    total: stats?.total || 0,
    waiting: stats?.waiting || 0,
    served: stats?.served || 0,
    avgHandlingMin: stats?.avgHandling || 0,
    completionRate: stats?.total ? Math.round(((stats?.served || 0) / stats.total) * 100) : 0,
    peakHour: { hour: 0, count: 0 },
    byHour: Array.from({ length: 24 }, (_, hour) => ({ hour, count: 0 })),
    byStatus: [
      { name: "Waiting", value: stats?.waiting || 0 },
      { name: "In Progress", value: 0 },
      { name: "Served", value: stats?.served || 0 },
    ],
  });

  const fetchData = async () => {
    setLoading(true);
    setError("");
    const params = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;

    try {
      const res = await API.get("/tickets/stats/detailed", { params });
      setData(res.data);
      setLoading(false);
      return;
    } catch (err) {
      if (err?.response?.status !== 404) {
        console.error(err);
        setError("Unable to load statistics.");
        setData(null);
        setLoading(false);
        return;
      }
    }

    // Fallback for older backends that only expose /tickets/stats.
    try {
      const fallbackRes = await API.get("/tickets/stats");
      setData(normalizeBasicStats(fallbackRes.data));
    } catch (fallbackErr) {
      console.error(fallbackErr);
      setError("Unable to load statistics.");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [startDate, endDate]);

  if (loading && !data) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-body">
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  if (!data) return <div className="p-5 text-center">{error || "No data available"}</div>;

  const BUSINESS_START_HOUR = 8;
  const BUSINESS_END_HOUR = 19;
  const visibleByHour = (data.byHour || []).filter(
    (h) => h.hour >= BUSINESS_START_HOUR && h.hour <= BUSINESS_END_HOUR
  );
  const visiblePeakHour = visibleByHour.reduce(
    (max, h) => (h.count > max.count ? h : max),
    { hour: BUSINESS_START_HOUR, count: 0 }
  );

  // Chart Data: Hourly Traffic
  const barData = {
    labels: visibleByHour.map((h) => `${h.hour}h`),
    datasets: [
      {
        label: 'Tickets',
        data: visibleByHour.map((h) => h.count),
        backgroundColor: 'rgba(13, 110, 253, 0.7)',
        borderColor: 'rgb(13, 110, 253)',
        borderWidth: 1,
        borderRadius: 5,
      },
    ],
  };

  // Chart Data: Status Distribution (Waiting vs In Progress vs Served)
  const pieData = {
    labels: ["Waiting", "In Progress", "Served", "Cancelled"],
    datasets: [
      {
        data: [
          data.byStatus?.find((s) => s.name === "Waiting")?.value || 0,
          data.byStatus?.find((s) => s.name === "In Progress")?.value || 0,
          data.byStatus?.find((s) => s.name === "Served")?.value || 0,
          data.byStatus?.find((s) => s.name === "Cancelled")?.value || 0,
        ],
        backgroundColor: [
          'rgba(245, 158, 11, 0.75)',
          'rgba(37, 99, 235, 0.75)',
          'rgba(22, 163, 74, 0.75)',
          'rgba(107, 114, 128, 0.75)',
        ],
        borderWidth: 1,
      },
    ],
  };

  return (
    <div className="min-vh-100 bg-body pb-5">
      <div className="bg-dark text-white py-4 shadow-sm mb-4">
        <Container>
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
            <h2 className="mb-0 fw-bold fs-3 fs-md-2">
              <i className="bi bi-graph-up-arrow me-3 text-primary"></i>
              Detailed Analytics
            </h2>
            <div
              className="d-flex align-items-end gap-2 flex-wrap w-100 w-md-auto p-2 p-sm-3 rounded-3"
              style={{ backgroundColor: "rgba(255,255,255,0.1)" }}
            >
              <Form.Group className="mb-0">
                <Form.Label className="text-white-50 small mb-1">From</Form.Label>
                <Form.Control
                  type="date"
                  size="sm"
                  className="bg-white border-0"
                  style={{ minWidth: "150px" }}
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </Form.Group>
              <Form.Group className="mb-0">
                <Form.Label className="text-white-50 small mb-1">To</Form.Label>
                <Form.Control
                  type="date"
                  size="sm"
                  className="bg-white border-0"
                  style={{ minWidth: "150px" }}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </Form.Group>
              <button className="btn btn-outline-light btn-sm px-3" onClick={() => window.print()}>
                <i className="bi bi-file-pdf me-1"></i> Export PDF
              </button>
            </div>
          </div>
        </Container>
      </div>

      <Container>
        {loading && <div className="text-center mb-3"><Spinner size="sm" animation="border" variant="primary" /> Updating...</div>}

        {/* KPI Row */}
        <Row className="g-4 mb-5">
          <Col lg={3} md={6}>
            <Card className="border-0 shadow-sm rounded-4 h-100 bg-primary text-white">
              <Card.Body className="p-4 d-flex align-items-center justify-content-between">
                <div>
                  <p className="mb-1 text-uppercase fw-bold opacity-75 small">Completion Rate</p>
                  <h2 className="fw-bold mb-0" style={{ fontSize: "clamp(2rem, 4.6vw, 3rem)" }}>{data.completionRate}%</h2>
                </div>
                <i className="bi bi-pie-chart-fill opacity-50 fs-1"></i>
              </Card.Body>
            </Card>
          </Col>
          <Col lg={3} md={6}>
            <Card className="border-0 shadow-sm rounded-4 h-100 bg-success text-white">
              <Card.Body className="p-4 d-flex align-items-center justify-content-between">
                <div>
                  <p className="mb-1 text-uppercase fw-bold opacity-75 small">Avg Handling</p>
                  <h2 className="fw-bold mb-0" style={{ fontSize: "clamp(2rem, 4.6vw, 3rem)" }}>{data.avgHandlingMin} <small className="fs-6">min</small></h2>
                </div>
                <i className="bi bi-stopwatch-fill opacity-50 fs-1"></i>
              </Card.Body>
            </Card>
          </Col>
          <Col lg={3} md={6}>
            <Card className="border-0 shadow-sm rounded-4 h-100 bg-warning text-dark">
              <Card.Body className="p-4 d-flex align-items-center justify-content-between">
                <div>
                  <p className="mb-1 text-uppercase fw-bold opacity-75 small">Peak Hour</p>
                  <h2 className="fw-bold mb-0" style={{ fontSize: "clamp(2rem, 4.6vw, 3rem)" }}>{visiblePeakHour.hour}:00</h2>
                </div>
                <i className="bi bi-lightning-charge-fill opacity-50 fs-1"></i>
              </Card.Body>
            </Card>
          </Col>
          <Col lg={3} md={6}>
            <Card className="border-0 shadow-sm rounded-4 h-100 bg-info text-white">
              <Card.Body className="p-4 d-flex align-items-center justify-content-between">
                <div>
                  <p className="mb-1 text-uppercase fw-bold opacity-75 small">Total Tickets</p>
                  <h2 className="fw-bold mb-0" style={{ fontSize: "clamp(2rem, 4.6vw, 3rem)" }}>{data.total}</h2>
                </div>
                <i className="bi bi-people-fill opacity-50 fs-1"></i>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        <Row className="g-4 mb-4">
          {/* Status Breakdown - Pie Chart */}
          <Col lg={6}>
            <Card className="border-0 shadow-sm h-100 rounded-4">
              <Card.Body className="p-4">
                <h5 className="fw-bold mb-4">Ticket Status Distribution</h5>
                <div style={{ height: "clamp(220px, 40vw, 300px)" }} className="d-flex justify-content-center">
                  <Pie data={pieData} options={{ maintainAspectRatio: false }} />
                </div>
              </Card.Body>
            </Card>
          </Col>

          {/* Hourly Traffic - Bar Chart */}
          <Col lg={6}>
            <Card className="border-0 shadow-sm h-100 rounded-4">
              <Card.Body className="p-4">
                <h5 className="fw-bold mb-4">Hourly Traffic</h5>
                <div style={{ height: "clamp(220px, 40vw, 300px)" }}>
                  <Bar
                    data={barData}
                    options={{
                      maintainAspectRatio: false,
                      scales: { y: { beginAtZero: true, grid: { display: false } }, x: { grid: { display: false } } },
                      plugins: { legend: { display: false } }
                    }}
                  />
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        <Row className="g-4 mt-1">
          <Col md={12}>
            <Card className="border-0 shadow-sm rounded-4 bg-body-tertiary">
              <Card.Body className="p-4 text-center">
                <p className="text-muted mb-0 small">
                  <i className="bi bi-info-circle me-1"></i>
                  Data reflects tickets created between <strong>{startDate || "Today"}</strong> and <strong>{endDate || "Now"}</strong>.
                </p>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
}
