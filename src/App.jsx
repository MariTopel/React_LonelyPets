import { useState, useEffect } from "react";
import PetForm from "./components/PetForm";
import ConfirmationView from "./components/ConfirmationView";
import ChatView from "./components/ChatView";

export default function App() {
  const [pet, setPet] = useState(null);

  // on mount, hydrate from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("myPet");
    if (stored) setPet(JSON.parse(stored));
  }, []);

  // save and reset handlers
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
  );
}
