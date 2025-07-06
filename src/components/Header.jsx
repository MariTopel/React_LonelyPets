// src/components/Header.jsx
import { Link } from "react-router-dom";
import React from "react";

export default function Header({ session, onLogin, onLogout }) {
  return (
    <header className="site-header">
      <div className="logo">
        <Link to="/">LonelyPets</Link>
      </div>
      <nav className="site-nav">
        <Link to="/">Home</Link>
        <Link to="/maps">Maps</Link>
        {/* New profile link */}
        {session?.user && <Link to="/profile">My Profile</Link>}
        <Link to="/about">About</Link>
        <div className="auth-buttons">
          {session ? (
            <button onClick={onLogout}>Logout</button>
          ) : (
            <button onClick={onLogin}>Login</button>
          )}
        </div>
      </nav>
    </header>
  );
}
