// src/components/MapsLayout.jsx
import { Outlet, NavLink } from "react-router-dom";
import "./MapsLayout.css"; // optional styles

const maps = [
  { id: "city", name: "The Great City of Archadeus" },
  { id: "desert", name: "The Sand Snake Expanse" },
  { id: "coast", name: "The Eldritch Coast" },
];

export default function MapsLayout() {
  return (
    <div className="maps-layout">
      <nav className="maps-nav">
        {maps.map((m) => (
          <NavLink
            key={m.id}
            to={m.id}
            className={({ isActive }) =>
              "maps-link" + (isActive ? " maps-link--active" : "")
            }
          >
            {m.name}
          </NavLink>
        ))}
      </nav>
      <div className="maps-content">
        {/* this is where MapPage will render */}
        <Outlet />
      </div>
    </div>
  );
}
