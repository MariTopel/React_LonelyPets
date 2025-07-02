// src/components/ConfirmationView.jsx

import React from "react";

export default function ConfirmationView({ pet, onReset }) {
  // Turn "space octopus" → "space-octopus.png"
  const fileName = pet.type.replace(/ /g, "-").toLowerCase();
  // Prepend Vite's BASE_URL so it becomes
  //  - "/images/dragon.png" in dev
  //  - "/React_LonelyPets/images/dragon.png" on GitHub Pages
  const imageSrc = import.meta.env.BASE_URL + `images/${fileName}.png`;

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
