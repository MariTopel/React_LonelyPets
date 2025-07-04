// src/components/Header.jsx
import { Link } from "react-router-dom";

export default function Header({ session, onLogin, onLogout }) {
  return (
    <header className="site-header">
      <div className="logo">
        <Link to="/">🐾 LonelyPets</Link>
      </div>
      <nav className="site-nav">
        <Link to="/">Home</Link>
        <Link to="/my-pets">My Pet</Link>
        <Link to="/maps">Maps</Link>
        <Link to="/about">About</Link>
      </nav>
      <div className="auth-buttons">
        {session ? (
          <button onClick={onLogout}>Logout</button>
        ) : (
          <button onClick={onLogin}>Login</button>
        )}
      </div>
    </header>
  );
}
