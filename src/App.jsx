// src/App.jsx

import React, { useState, useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import { supabase } from "./supabaseClient";

// UI Components
import Header from "./components/Header";
import AuthForm from "./components/AuthForm";
import PetForm from "./components/PetForm";
import ConfirmationView from "./components/ConfirmationView";
import ChatView from "./components/ChatView";
import MapsLayout from "./components/MapsLayout";
import MapPage from "./components/MapPage";

export default function App() {
  // --- State hooks ---
  // `pet` holds the current pet selection ({ type, name }) or null
  const [pet, setPet] = useState(null);
  // `session` holds the Supabase auth session object or null
  const [session, setSession] = useState(null);
  // `showLogin` toggles the login overlay visibility
  const [showLogin, setShowLogin] = useState(false);

  // --- Effect: run once on component mount ---
  useEffect(() => {
    // 1) Load pet from localStorage (if the user has already chosen one)
    const stored = localStorage.getItem("myPet");
    if (stored) {
      setPet(JSON.parse(stored));
    }

    // 2) Fetch the current Supabase session (if the user is already logged in)
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    // 3) Subscribe to auth state changes (login/logout)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, newSession) => {
      setSession(newSession);
    });

    // Cleanup subscription when component unmounts
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // --- Handlers for pet creation & reset ---
  function savePet(data) {
    // Update state and persist to localStorage
    setPet(data);
    localStorage.setItem("myPet", JSON.stringify(data));
  }

  function resetPet() {
    // Clear state and remove stored data
    setPet(null);
    localStorage.removeItem("myPet");
    localStorage.removeItem("chatHistory");
  }

  return (
    <>
      {/* --- Site Header with Login/Logout --- */}
      <Header
        session={session} // current auth state
        onLogin={() => setShowLogin(true)} // open login form
        onLogout={() => supabase.auth.signOut()} // sign the user out
      />

      {/* --- Optional Login Overlay --- */}
      {/* Only show when user clicks “Login” and is not yet authenticated */}
      {showLogin && !session && (
        <AuthForm onSuccess={() => setShowLogin(false)} />
      )}

      {/* --- Main Application Routes --- */}
      <Routes>
        {/* Home ("/"): either pet creation or pet confirmation + chat */}
        <Route
          path="/"
          element={
            <div className="app-container">
              {pet ? (
                <>
                  {/* Show pet summary & reset button */}
                  <ConfirmationView pet={pet} onReset={resetPet} />
                  {/* Only show chat if user is logged in */}
                  {session?.user && <ChatView user={session.user} />}
                </>
              ) : (
                /* Show pet-selection form if no pet chosen */
                <PetForm onSave={savePet} />
              )}
            </div>
          }
        />

        {/* My Pets ("/my-pets"): dedicated summary view */}
        <Route
          path="/my-pets"
          element={
            <div className="app-container">
              <ConfirmationView pet={pet} onReset={resetPet} />
            </div>
          }
        />

        {/* Maps section ("/maps/*") with nested routes */}
        <Route path="/maps" element={<MapsLayout />}>
          {/* Index route: "/maps" */}
          <Route
            index
            element={
              <div className="app-container" style={{ padding: "1rem" }}>
                Please select a map from the menu.
              </div>
            }
          />
          {/* Dynamic map page: "/maps/:mapId" */}
          <Route
            path=":mapId"
            element={
              <div className="app-container">
                {/* MapPage shows map details and its ChatView */}
                <MapPage user={session?.user} />
              </div>
            }
          />
        </Route>

        {/* About page ("/about") */}
        <Route
          path="/about"
          element={
            <div className="app-container" style={{ padding: "1rem" }}>
              <h2>About LonelyPets</h2>
              <p>
                LonelyPets is a fun virtual pet world where you can explore maps
                and chat with your AI pet friend.
              </p>
            </div>
          }
        />

        {/* Fallback for unmatched routes (404) */}
        <Route
          path="*"
          element={
            <div className="app-container" style={{ padding: "1rem" }}>
              <h2>Page not found</h2>
              <p>Sorry, that route doesn’t exist.</p>
            </div>
          }
        />
      </Routes>
    </>
  );
}
