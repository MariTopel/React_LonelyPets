// src/components/ProfileForm.jsx
import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

export default function ProfileForm({ user, onSaved }) {
  // Form fields
  const [name, setName] = useState("");
  const [color, setColor] = useState("");
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // If there's no user yet, nothing to load
    if (!user?.id) return;

    setLoading(true);
    (async () => {
      // 1) Fetch existing profile row for this user
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, favorite_color, bio")
        .eq("user_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") {
        // PGRST116 = no rows found, which is fine
        console.error("Profile load error:", error);
      }

      if (data) {
        setName(data.full_name || "");
        setColor(data.favorite_color || "");
        setBio(data.bio || "");
      }

      setLoading(false);
    })();
  }, [user]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!user?.id) return;

    setLoading(true);
    const { error } = await supabase
      .from("profiles")
      .upsert({
        user_id: user.id,
        full_name: name,
        favorite_color: color,
        bio,
      })
      .select(); // returning the row

    if (error) {
      console.error("Profile upsert error:", error);
      alert("Failed to save profile.");
    } else {
      onSaved?.();
    }
    setLoading(false);
  }

  return (
    <form className="profile-form" onSubmit={handleSubmit}>
      <h2>Your Profile</h2>

      {loading && <p>Loading…</p>}

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

      <button type="submit" disabled={loading}>
        {loading ? "Saving…" : "Save Profile"}
      </button>
    </form>
  );
}
