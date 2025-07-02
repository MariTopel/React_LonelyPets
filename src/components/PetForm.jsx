import { useState } from "react";

export default function PetForm({ onSave }) {
  const [type, setType] = useState("");
  const [name, setName] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    onSave({ type, name: name.trim() });
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

      <button type="submit" className="pet-form-button">
        Save Pet
      </button>
    </form>
  );
}
