import { useEffect, useState } from "react";

export function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(
    !!document.fullscreenElement
  );

  useEffect(() => {
    const controller = new AbortController();
    document.addEventListener("fullscreenchange", () => setIsFullscreen(!!document.fullscreenElement), { signal: controller.signal });
    
    return () => controller.abort();
  }, []);

  return isFullscreen;
}