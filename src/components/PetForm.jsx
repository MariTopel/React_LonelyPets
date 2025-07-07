import { useState } from "react";

export default function PetForm({ onSave }) {
  const [type, setType] = useState("");
  const [name, setName] = useState("");
  const [personality, setPersonality] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    onSave({
      type,
      name: name.trim(),
      personality, // include selected personality
    });
  }

  return (
    <form id="pet-form" className="pet-form" onSubmit={handleSubmit}>
      <label htmlFor="pet-type" className="pet-form-label">
        Choose a pet:
      </label>
      <select
        id="pet-type"
        className="pet-form-select"
        value={type}
        onChange={(e) => setType(e.target.value)}
        required
      >
        <option value="" disabled>
          Select your pet
        </option>
        <option value="dragon">Dragon</option>
        <option value="cat">Cat</option>
        <option value="dog">Dog</option>
        <option value="plant">Plant</option>
        <option value="space octopus">Space Octopus</option>
      </select>

      <label htmlFor="pet-name" className="pet-form-label">
        Name your pet:
      </label>
      <input
        id="pet-name"
        className="pet-form-input"
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />

      <label htmlFor="pet-personality" className="pet-form-label">
        Choose a personality:
      </label>
      <select
        id="pet-personality"
        className="pet-form-select"
        value={personality}
        onChange={(e) => setPersonality(e.target.value)}
        required
      >
        <option value="" disabled>
          Select personality
        </option>
        <option value="shy and sweet">Shy & Sweet</option>
        <option value="bold and adventurous">Bold & Adventurous</option>
        <option value="wise and kind">Wise & Kind</option>
        <option value="sassy and sarcastic">Sassy & Sarcastic</option>
        <option value="chaotic and funny">Chaotic & Funny</option>
        <option value="gentle and thoughtful">Gentle & Thoughtful</option>
      </select>

      <button type="submit" className="pet-form-button">
        Save Pet
      </button>
    </form>
  );
}
