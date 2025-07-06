import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

export default function ProfileForm({ onSaved }) {
  // Local form state
  const [name, setName] = useState("");
  const [color, setColor] = useState("");
  const [bio, setBio] = useState("");

  useEffect(() => {
    // On mount, load existing profile (if any)
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, favorite_color, bio")
        .eq("user_id", supabase.auth.getUserSync().id)
        .single();
      if (data) {
        setName(data.full_name || "");
        setColor(data.favorite_color || "");
        setBio(data.bio || "");
      }
    })();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    const userId = supabase.auth.getUserSync().id;
    await supabase.from("profiles").upsert({
      user_id: userId,
      full_name: name,
      favorite_color: color,
      bio,
    });
    onSaved?.();
  }

  return (
    <form onSubmit={handleSubmit} className="profile-form">
      <h2>Your Profile</h2>
      <label>
        Name
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <label>
        Favorite Color
        <input
          type="text"
          value={color}
          onChange={(e) => setColor(e.target.value)}
        />
      </label>
      <label>
        About You
        <textarea value={bio} onChange={(e) => setBio(e.target.value)} />
      </label>
      <button type="submit">Save Profile</button>
    </form>
  );
}
