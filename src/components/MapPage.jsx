import { useParams } from "react-router-dom";
import ChatView from "./ChatView";

const maps = [
  { id: "city", name: "The Great City of Archadeus" },
  { id: "desert", name: "The Sand Snake Expanse" },
  { id: "coast", name: "The Eldritch Coast" },
];

export default function MapPage({ user }) {
  if (!user) return null; // or show “please log in” this is the second guard to prevent crashing without a session
  const { mapId } = useParams();
  // find the map name, or default to the raw id:
  const map = maps.find((m) => m.id === mapId);
  const title = map ? map.name : mapId;

  return (
    <>
      <h2>{title}</h2>
      <p>Welcome to {title}! Explore and chat with your pet here.</p>
      {/* pass the full path so ChatView scopes messages correctly */}
      <ChatView user={user} page={`/maps/${mapId}`} />
    </>
  );
}
