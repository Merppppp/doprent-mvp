"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { AREAS } from "@/lib/areas";

export type UserLoc = { lat: number; lng: number } | null;
export type LocSource = "gps" | "area" | null;
export type LocStatus = "idle" | "loading" | "denied" | "error";

type Ctx = {
  loc: UserLoc;
  label: string | null;
  source: LocSource;
  status: LocStatus;
  requestGps: () => void;
  setArea: (key: string) => void;
  clear: () => void;
  radius: number | null;
  setRadius: (r: number | null) => void;
};

const LocationContext = createContext<Ctx | null>(null);

const STORE_KEY = "dr_loc_v1";

export function useUserLocation(): Ctx {
  const v = useContext(LocationContext);
  if (!v) throw new Error("useUserLocation must be used inside <LocationProvider>");
  return v;
}

export default function LocationProvider({ children }: { children: React.ReactNode }) {
  const [loc, setLoc] = useState<UserLoc>(null);
  const [label, setLabel] = useState<string | null>(null);
  const [source, setSource] = useState<LocSource>(null);
  const [status, setStatus] = useState<LocStatus>("idle");
  const [radius, setRadius] = useState<number | null>(null);

  // Restore last choice.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return;
      const v = JSON.parse(raw) as { loc: UserLoc; label: string | null; source: LocSource };
      if (v.loc && typeof v.loc.lat === "number" && typeof v.loc.lng === "number") {
        setLoc(v.loc);
        setLabel(v.label ?? null);
        setSource(v.source ?? null);
      }
    } catch {
      /* ignore corrupt store */
    }
  }, []);

  const persist = useCallback((l: UserLoc, lb: string | null, s: LocSource) => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({ loc: l, label: lb, source: s }));
    } catch {
      /* storage may be unavailable */
    }
  }, []);

  const requestGps = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatus("error");
      return;
    }
    setStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const l = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setLoc(l);
        setLabel("ตำแหน่งของคุณ");
        setSource("gps");
        setStatus("idle");
        persist(l, "ตำแหน่งของคุณ", "gps");
      },
      (err) => {
        setStatus(err.code === err.PERMISSION_DENIED ? "denied" : "error");
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  }, [persist]);

  const setArea = useCallback(
    (key: string) => {
      const a = AREAS[key];
      if (!a) return;
      const l = { lat: a.lat, lng: a.lng };
      const lb = a.th;
      setLoc(l);
      setLabel(lb);
      setSource("area");
      setStatus("idle");
      persist(l, lb, "area");
    },
    [persist],
  );

  const clear = useCallback(() => {
    setLoc(null);
    setLabel(null);
    setSource(null);
    setStatus("idle");
    try {
      localStorage.removeItem(STORE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <LocationContext.Provider value={{ loc, label, source, status, requestGps, setArea, clear, radius, setRadius }}>
      {children}
    </LocationContext.Provider>
  );
}
