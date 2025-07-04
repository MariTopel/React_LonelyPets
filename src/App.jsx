// src/App.jsx
import { Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import PetForm from "./components/PetForm";
import ConfirmationView from "./components/ConfirmationView";
import ChatView from "./components/ChatView";
import AuthForm from "./components/AuthForm";
import { supabase } from "./supabaseClient";
import React, { useState, useEffect } from "react";

export default function App() {
  const [pet, setPet] = useState(null);
  const [session, setSession] = useState(null);
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => {
    // hydrate pet
    const stored = localStorage.getItem("myPet");
    if (stored) setPet(JSON.parse(stored));
    // hydrate session
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

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
      <Header
        session={session}
        onLogin={() => setShowLogin(true)}
        onLogout={() => supabase.auth.signOut()}
      />
      {/* optional login overlay */}
      {showLogin && !session && (
        <AuthForm onSuccess={() => setShowLogin(false)} />
      )}

      <Routes>
        {/* Home just shows pet selection / confirmation */}
        <Route
          path="/"
          element={
            <div className="app-container">
              {pet ? (
                <>
                  <ConfirmationView pet={pet} onReset={resetPet} />

                  {/* Only render ChatView once session.user exists */}
                  {session?.user && <ChatView user={session.user} />}

                  {/* Alternatively, always render but let ChatView guard itself:
            <ChatView user={session?.user} /> */}
                </>
              ) : (
                <PetForm onSave={savePet} />
              )}
            </div>
          }
        />
        <Route
          path="/my-pets"
          element={<ConfirmationView pet={pet} onReset={resetPet} />}
        />
        <Route
          path="/maps"
          element={
            <div style={{ padding: "1rem" }}>🗺️ map pages coming soon!</div>
          }
        />
        <Route
          path="/about"
          element={<div style={{ padding: "1rem" }}>About LonelyPets…</div>}
        />
        {/* fallback */}
        <Route path="*" element={<div>Page not found</div>} />
      </Routes>
    </>
  );
}
