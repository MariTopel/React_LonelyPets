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
  const [pet, setPet] = useState(null);
  const [session, setSession] = useState(null);
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("myPet");
    if (stored) {
      setPet(JSON.parse(stored));
    }

    supabase.auth.getSession().then(async ({ data }) => {
      const userSession = data.session;
      setSession(userSession);

      if (userSession?.user?.id) {
        const { data: pets, error } = await supabase
          .from("pets")
          .select("*")
          .eq("user_id", userSession.user.id)
          .order("created_at", { ascending: true })
          .limit(1);

        if (error) {
          console.error("Failed to load pet:", error);
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

    return () => subscription.unsubscribe();
  }, []);

  async function savePet(data) {
    try {
      const userId = session?.user?.id;
      if (!userId) {
        console.error("User not authenticated");
        return;
      }

      const newPet = {
        user_id: userId,
        name: data.name,
        type: data.type,
        personality: data.personality,
      };

      console.log("Attempting to insert pet via RPC:", newPet);

      // Use RPC to insert and unwrap the result array
      const { data: rpcResult, error } = await supabase.rpc("insert_pet", {
        p_user_id: userId,
        p_name: data.name,
        p_type: data.type,
        p_personality: data.personality,
      });

      if (error) {
        console.error("RPC insert error:", error);
        return;
      }

      // rpcResult returns an array of inserted rows; take the first
      const insertedPet = Array.isArray(rpcResult) ? rpcResult[0] : rpcResult;
      console.log("Pet inserted successfully:", insertedPet);

      setPet(insertedPet);
      localStorage.setItem("myPet", JSON.stringify(insertedPet));
    } catch (err) {
      console.error("Unexpected error in savePet:", err);
    }
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
      <Header
        session={session}
        onLogin={() => setShowLogin(true)}
        onLogout={() => supabase.auth.signOut()}
      />

      {showLogin && !session && (
        <AuthForm onSuccess={() => setShowLogin(false)} />
      )}

      <Routes>
        <Route
          path="/"
          element={
            <div className="app-container">
              {pet ? (
                <>
                  <ConfirmationView pet={pet} onReset={resetPet} />
                  {session?.user && <ChatView user={session.user} pet={pet} />}
                </>
              ) : (
                <PetForm onSave={savePet} />
              )}
            </div>
          }
        />

        <Route
          path="/profile"
          element={
            <div className="app-container">
              {session?.user ? (
                <ProfileForm user={session.user} onSaved={() => {}} />
              ) : (
                <p>Please log in to edit your profile.</p>
              )}
            </div>
          }
        />

        <Route
          path="/my-pets"
          element={
            <div className="app-container">
              <ConfirmationView pet={pet} onReset={resetPet} />
            </div>
          }
        />

        <Route path="/maps" element={<MapsLayout />}>
          <Route
            index
            element={
              <div className="app-container" style={{ padding: "1rem" }}>
                Please select a map from the menu.
              </div>
            }
          />
          <Route
            path=":mapId"
            element={
              <div className="app-container">
                <MapPage user={session?.user} />
              </div>
            }
          />
        </Route>

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
