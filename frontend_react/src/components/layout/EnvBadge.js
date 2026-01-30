import React from "react";
import { getApiBaseUrl } from "../../config/env";

export function EnvBadge() {
  const apiBaseUrl = getApiBaseUrl();
  return (
    <div className="envBadge" aria-label="Environment and backend target">
      <span className="envBadge__label">API</span>
      <span className="envBadge__value">{apiBaseUrl}</span>
    </div>
  );
}
