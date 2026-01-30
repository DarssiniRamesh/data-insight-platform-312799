import React from "react";
import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <div className="page">
      <h1 className="page__title">Page not found</h1>
      <p className="page__subtitle">
        The requested route does not exist. Use navigation or return to the dashboard.
      </p>
      <Link className="btn btnPrimary" to="/dashboard">
        Go to dashboard
      </Link>
    </div>
  );
}
