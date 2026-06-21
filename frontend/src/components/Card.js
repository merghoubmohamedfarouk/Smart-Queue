import React from "react";
import Card from "react-bootstrap/Card";

export default function AppCard({ children, title, className = "" }) {
  return (
    <Card className={`shadow ${className}`}>
      <Card.Body>
        {title && <Card.Title className="mb-4">{title}</Card.Title>}
        {children}
      </Card.Body>
    </Card>
  );
}