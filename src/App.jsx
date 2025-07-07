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
import ProfileForm from "./components/ProfileForm";

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
    const stored = localStorage.getItem("myPet");
    if (stored) {
      setPet(JSON.parse(stored));
    }

    supabase.auth.getSession().then(async ({ data }) => {
      const userSession = data.session;
      setSession(userSession);

      if (userSession?.user?.id) {
        // 🔍 Load most recent pet from Supabase
        const { data: pets, error } = await supabase
          .from("pets")
          .select("*")
          .eq("user_id", userSession.user.id)
          .order("created_at", { ascending: false })
          .limit(1);

        if (error) {
          console.error("Failed to load pet from Supabase:", error);
        } else if (pets.length > 0) {
          setPet(pets[0]);
          localStorage.setItem("myPet", JSON.stringify(pets[0]));
        }
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, newSession) => {
      setSession(newSession);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // --- Handlers for pet creation & reset and save data to supabase ---
  async function savePet(data) {
    const userId = session?.user?.id;
    if (!userId) return;

    console.log("🐾 userId from session:", session?.user?.id);
    console.log(
      "🐾 auth.uid() (expected value): will match this in RLS policy"
    );

    // Save to Supabase
    const { data: insertedPet, error } = await supabase
      .from("pets")
      .insert([
        {
          user_id: userId,
          name: data.name,
          type: data.type,
          personality: data.personality,
        },
      ])
      .select()
      .single(); // get the newly created row back

    if (error) {
      console.error("Supabase insert error:", error);
      return;
    }

    // Save to state & localStorage
    setPet(insertedPet);
    localStorage.setItem("myPet", JSON.stringify(insertedPet));
  }

  async function resetPet() {
    setPet(null);
    localStorage.removeItem("myPet");
    localStorage.removeItem("chatHistory");

    const userId = session?.user?.id;
    if (userId) {
      await supabase.from("pets").delete().eq("user_id", userId);
    }
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
                  {session?.user && <ChatView user={session.user} pet={pet} />}
                </>
              ) : (
                /* Show pet-selection form if no pet chosen */
                <PetForm onSave={savePet} />
              )}
            </div>
          }
        />

        {/* Profile editing page */}
        <Route
          path="/profile"
          element={
            <div className="app-container">
              {session?.user ? (
                <ProfileForm
                  user={session.user}
                  onSaved={() => {
                    /* e.g. navigate("/") or close a modal */
                  }}
                />
              ) : (
                <p>Please log in to edit your profile.</p>
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
