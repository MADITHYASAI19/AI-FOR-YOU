import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import API from "../utils/api";
import { safeApiCall } from "../utils/asyncHandler";

/* SVG icons matching fullaiml.html */
const P = {
  db: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/>',
  home: '<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
  grid: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>',
  spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4"/><circle cx="12" cy="12" r="3"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  cpu: '<rect x="5" y="5" width="14" height="14" rx="2"/><path d="M9 1v4M15 1v4M9 19v4M15 19v4M1 9h4M1 15h4M19 9h4M19 15h4"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/>',
  play: '<path d="M6 4l14 8-14 8z"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>',
  chev: '<path d="M6 9l6 6 6-6"/>',
  menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/>',
};

const icon = (n) => (
  <svg className="i" viewBox="0 0 24 24" dangerouslySetInnerHTML={{ __html: P[n] || "" }} />
);

const NAV_ITEMS = [
  { path: "/dashboard", label: "Dashboard", ic: "home" },
  { path: "/preprocessing", label: "Preprocessing", ic: "gear" },
  { path: "/eda", label: "Automated EDA", ic: "spark" },
  { path: "/visualizations", label: "Visualizations", ic: "chart" },
  { path: "/ml-model", label: "Model Training", ic: "cpu" },
  { path: "/ml-comparison", label: "Compare Models", ic: "target" },
  { path: "/models", label: "Models", ic: "db" },
  { path: "/predictions", label: "Predictions", ic: "play" },
];

const Sidebar = ({ open, onClose }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const logout = () => {
    localStorage.removeItem("token");
    navigate("/login");
    onClose();
  };

  return (
    <>
      <aside className={`sidebar${open ? " open" : ""}`} id="sidebar">
        {/* Brand */}
        <div className="brand" style={{ cursor: "pointer" }} onClick={() => { navigate("/dashboard"); onClose(); }}>
          <svg className="i" viewBox="0 0 24 24" style={{ width: 26, height: 26 }} dangerouslySetInnerHTML={{ __html: P.db }} />
          FullAIML
        </div>

        {/* Nav */}
        <nav id="nav" style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
          {NAV_ITEMS.map(({ path, label, ic }) => (
            <Link
              key={path}
              to={path}
              className={`nav${location.pathname === path ? " active" : ""}`}
              onClick={onClose}
            >
              {icon(ic)}
              {label}
            </Link>
          ))}
        </nav>

        {/* Settings at bottom */}
        <Link
          to="/profile"
          className={`nav settings${location.pathname === "/profile" ? " active" : ""}`}
          onClick={onClose}
        >
          {icon("user")}
          Profile
        </Link>
      </aside>

      {/* Mobile backdrop */}
      <div className={`scrim${open ? " show" : ""}`} onClick={onClose} />
    </>
  );
};

const Navbar = ({ children }) => {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const [user, setUser] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userRef = useRef(null);

  useEffect(() => {
    if (!token) return;
    const getUser = async () => {
      const [response] = await safeApiCall(API.get("/auth/me"));
      if (response) setUser(response.data);
    };
    getUser();
  }, [token]);

  useEffect(() => {
    const close = (e) => {
      if (userRef.current && !userRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  if (!token) return null;

  const initials = (user?.username || user?.email || "U").slice(0, 1).toUpperCase();
  const displayName = user?.username || "Account";

  const logout = () => {
    localStorage.removeItem("token");
    setUserMenuOpen(false);
    navigate("/login");
  };

  return (
    <>
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />

      <div className="main">
        {/* Topbar */}
        <header className="topbar" id="topbar-el">
          <button
            className="menu-btn"
            id="menu-btn"
            aria-label="Open menu"
            onClick={() => setMenuOpen(true)}
          >
            {icon("menu")}
          </button>

          <label className="search">
            {icon("search")}
            <input placeholder="Search datasets, models, or anything..." id="gsearch" />
          </label>

          <div className="spacer" />

          <button className="icon-btn" aria-label="Notifications">
            {icon("bell")}
            <i className="dot" />
          </button>

          <div className="user" ref={userRef}>
            <button
              className="user"
              id="user-btn"
              onClick={() => setUserMenuOpen((o) => !o)}
              style={{ background: "none", border: 0, cursor: "pointer" }}
            >
              <span className="avatar">{initials}</span>
              <span id="uname">{displayName}</span>
              {icon("chev")}
            </button>

            {userMenuOpen && (
              <div className="menu" id="user-menu">
                <button onClick={() => { setUserMenuOpen(false); navigate("/profile"); }}>Profile</button>
                <button id="logout" onClick={logout}>Log out</button>
              </div>
            )}
          </div>
        </header>

        {children}
      </div>
    </>
  );
};

export default Navbar;
