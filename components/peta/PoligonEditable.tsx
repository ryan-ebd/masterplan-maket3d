"use client";

// Wrapper imperatif google.maps.Polygon editable — TANPA DrawingManager
// (Drawing Library dideprekasi Agu 2025, dihapus Mei 2026).
import { useEffect, useRef } from "react";
import { useMap, useMapsLibrary } from "@vis.gl/react-google-maps";
import type { LatLng } from "@/lib/geo";

export default function PoligonEditable({
  path,
  onChange,
  editable = true,
}: {
  path: LatLng[];
  onChange: (path: LatLng[]) => void;
  editable?: boolean;
}) {
  const map = useMap();
  const maps = useMapsLibrary("maps");
  const polyRef = useRef<google.maps.Polygon | null>(null);
  const listenersRef = useRef<google.maps.MapsEventListener[]>([]);
  const suppressRef = useRef(false);
  const lastEmittedRef = useRef<string>("");
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const pathRef = useRef(path);
  pathRef.current = path;

  function attachListeners(poly: google.maps.Polygon) {
    listenersRef.current.forEach((l) => l.remove());
    const mvc = poly.getPath();
    const emit = () => {
      if (suppressRef.current) return;
      const arr = poly
        .getPath()
        .getArray()
        .map((ll) => ll.toJSON());
      lastEmittedRef.current = JSON.stringify(arr);
      onChangeRef.current(arr);
    };
    listenersRef.current = [
      mvc.addListener("set_at", emit), // vertex digeser
      mvc.addListener("insert_at", emit), // midpoint ditarik -> vertex baru
      mvc.addListener("remove_at", emit),
    ];
  }

  // Buat polygon SEKALI — JANGAN masukkan `path` ke deps (loop Polygon <-> React).
  useEffect(() => {
    if (!map || !maps) return;
    const poly = new maps.Polygon({
      paths: pathRef.current,
      editable,
      strokeColor: "#1e5a46",
      strokeWeight: 2,
      fillColor: "#1e5a46",
      fillOpacity: 0.12,
    });
    poly.setMap(map);
    polyRef.current = poly;
    attachListeners(poly);
    return () => {
      listenersRef.current.forEach((l) => l.remove());
      poly.setMap(null);
      polyRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, maps]);

  // Sinkronisasi eksternal (draft LLM / muat ulang) — setPath mengganti MVCArray,
  // listener lama mati: pasang ulang.
  useEffect(() => {
    const poly = polyRef.current;
    if (!poly) return;
    if (JSON.stringify(path) === lastEmittedRef.current) return; // perubahan dari kami sendiri
    suppressRef.current = true;
    poly.setPath(path);
    attachListeners(poly);
    suppressRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);

  useEffect(() => {
    polyRef.current?.setEditable(editable);
  }, [editable]);

  return null;
}
