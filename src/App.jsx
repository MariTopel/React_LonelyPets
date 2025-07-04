// src/App.jsx
import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import AuthForm from "./components/AuthForm";
import PetForm from "./components/PetForm";
import ConfirmationView from "./components/ConfirmationView";
import ChatView from "./components/ChatView";

export default function App() {
  // Your existing pet state
  const [pet, setPet] = useState(null);

  // New: track Supabase session
  const [session, setSession] = useState(null);
  // New: control whether to show the login overlay
  const [showLogin, setShowLogin] = useState(false);

  // On mount, hydrate pet from localStorage & supabase session
  useEffect(() => {
    const stored = localStorage.getItem("myPet");
    if (stored) setPet(JSON.parse(stored));

    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) =>
      setSession(newSession)
    );
    return () => subscription.unsubscribe();
  }, []);

  // Your existing save/reset handlers
  function savePet(data) {
    setPet(data);
    localStorage.setItem("myPet", JSON.stringify(data));
  }
  function resetPet() {
    setPet(null);
    localStorage.removeItem("myPet");
    localStorage.removeItem("chatHistory");
  }

  return (
    <>
      {/* HEADER */}
      <header style={{ padding: "1rem", textAlign: "right" }}>
        {session ? (
          <button onClick={() => supabase.auth.signOut()}>Logout</button>
        ) : (
          <button onClick={() => setShowLogin(true)}>Login</button>
        )}
      </header>

      {/* LOGIN OVERLAY (only when no session) */}
      {showLogin && !session && (
        <AuthForm onSuccess={() => setShowLogin(false)} />
      )}

      {/* YOUR PET APP UI */}
      <div className="app-container">
        {pet ? (
          <>
            <ConfirmationView pet={pet} onReset={resetPet} />
            <ChatView />
          </>
        ) : (
          <PetForm onSave={savePet} />
        )}
      </div>
    </>
  );
}
