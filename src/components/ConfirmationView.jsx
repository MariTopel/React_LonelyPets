// src/components/ConfirmationView.jsx
import React from "react";

export default function ConfirmationView({ pet, onReset }) {
  // e.g. "space octopus" → "space-octopus.png"
  const fileName = pet.type.replace(/ /g, "-").toLowerCase() + ".png";
  // DEV: import.meta.env.BASE_URL === "/"
  // PROD: import.meta.env.BASE_URL === "/React_LonelyPets/"
  const imageSrc = `${import.meta.env.BASE_URL}images/${fileName}`;

  console.log("🖼️ ConfirmationView imageSrc =", imageSrc);

  return (
    <section id="confirmation" className="confirmation-view">
      <h2 className="confirmation-header">You have been matched with</h2>
      <img
        className="confirmation-image"
        src={imageSrc}
        alt={pet.type}
        width={150}
      />
      <p className="confirmation-summary">
        {pet.name} the {pet.type}
      </p>
      <button className="confirmation-button" onClick={onReset}>
        Start Over
      </button>
    </section>
  );
}
