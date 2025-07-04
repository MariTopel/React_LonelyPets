import { useState } from "react";
import { supabase } from "../supabaseClient";

export default function AuthForm({ onSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    // Try sign-up, else login
    let { error } = await supabase.auth.signUp({ email, password });
    if (error && !error.message.includes("already registered")) {
      return setError(error.message);
    }
    ({ error } = await supabase.auth.signInWithPassword({ email, password }));
    if (error) {
      setError(error.message);
    } else {
      onSuccess?.();
    }
  }

  return (
    <div className="auth-overlay">
      <form className="auth-form" onSubmit={handleSubmit}>
        <h2>Login / Sign Up</h2>
        {error && <p className="error">{error}</p>}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit">Go</button>
      </form>
    </div>
  );
}
