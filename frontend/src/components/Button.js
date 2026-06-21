import React from "react";
import Button from "react-bootstrap/Button";

export default function AppButton({ children, onClick, variant = "primary", className = "", ...props }) {
  return (
    <Button onClick={onClick} variant={variant} className={`shadow-sm rounded-pill px-4 ${className}`} {...props}>
      {children}
    </Button>
  );
}