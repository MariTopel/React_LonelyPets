// src/components/ConfirmationView.jsx

export default function ConfirmationView({ pet, onReset }) {
  // turn “space octopus” → “space-octopus.png”
  const fileName = pet.type.replace(/ /g, "-").toLowerCase();
  // build the path under public/images/
  const imageSrc = `/images/${fileName}.png`;

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
