"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import Spinner from "@/components/ui/Spinner";

export default function DescriptionBuilderPage() {
  const { getIdToken } = useAuth();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = await getIdToken();
      if (cancelled) return;
      try {
        if (token) localStorage.setItem("mpm_token", token);
      } catch {}
      setReady(true);
    })();
    return () => { cancelled = true; };
  }, [getIdToken]);

  return (
    <div className="h-[calc(100vh-4rem)] -m-6 flex flex-col">
      {!ready ? (
        <div className="flex-1 flex items-center justify-center">
          <Spinner size="lg" />
        </div>
      ) : (
        <iframe
          ref={iframeRef}
          src="/description-builder/index.html"
          className="flex-1 w-full border-0 bg-white"
          title="Description Builder"
        />
      )}
    </div>
  );
}
