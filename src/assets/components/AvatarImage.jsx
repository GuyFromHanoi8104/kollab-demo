import { useState } from "react";

// Renders a real profile photo when `url` is present and loads successfully;
// otherwise renders whatever `fallback` is (each caller's own existing
// colored-initial placeholder, left completely untouched so its look
// doesn't change for the many profiles that don't have a photo yet).
export default function AvatarImage({ url, size, radius, fallback }) {
  const [errored, setErrored] = useState(false);

  if (!url || errored) return fallback;

  return (
    <img
      src={url}
      alt=""
      onError={() => setErrored(true)}
      style={{ width: size, height: size, borderRadius: radius, objectFit: "cover", flexShrink: 0, display: "block" }}
    />
  );
}
