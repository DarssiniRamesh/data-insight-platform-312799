import React from "react";
import { NavLink, Outlet } from "react-router-dom";

import { EnvBadge } from "./EnvBadge";
import { SkipToContentLink } from "./SkipToContentLink";

/**
 * App shell layout:
 * - sidebar navigation
 * - top bar (title + environment badge)
 * - main content outlet
 */
export function AppLayout() {
  return (
    <div className="app-shell">
      <SkipToContentLink />
      <aside className="sidebar" aria-label="Primary navigation">
        <div className="sidebar__brand">
          <div className="sidebar__brandMark" aria-hidden="true">
            DP
          </div>
          <div className="sidebar__brandText">
            <div className="sidebar__brandTitle">Data Publishing</div>
            <div className="sidebar__brandSubtitle">Workflow V2</div>
          </div>
        </div>

        <nav className="sidebar__nav">
          <NavLink className="navItem" to="/dashboard">
            Dashboard
          </NavLink>
          <NavLink className="navItem" to="/register">
            Registration
          </NavLink>
          <NavLink className="navItem" to="/integrations">
            Integrations
          </NavLink>
          <NavLink className="navItem" to="/audit">
            Audit Log
          </NavLink>

          <div className="navDivider" role="separator" />

          <div className="navHelp">
            <div className="navHelp__title">Tip</div>
            <div className="navHelp__body">
              Dataset detail is under <code>/datasets/:draftId</code>.
            </div>
          </div>
        </nav>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="topbar__left">
            <div className="topbar__title">Data Product Publishing</div>
            <div className="topbar__subtitle">GxP-aligned workflow scaffolding</div>
          </div>
          <div className="topbar__right">
            <EnvBadge />
          </div>
        </header>

        <main id="main-content" className="content" role="main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
