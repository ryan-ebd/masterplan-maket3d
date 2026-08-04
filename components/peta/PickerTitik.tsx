"use client";

import { AdvancedMarker, Map, Pin } from "@vis.gl/react-google-maps";

const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID ?? "DEMO_MAP_ID";

export default function PickerTitik({
  value,
  onChange,
}: {
  value: { lat: number; lng: number } | null;
  onChange: (v: { lat: number; lng: number }) => void;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-line" style={{ height: 380 }}>
      <Map
        mapId={MAP_ID} // tanpa mapId, AdvancedMarker TIDAK dirender
        defaultCenter={{ lat: -6.9147, lng: 107.6098 }}
        defaultZoom={13}
        gestureHandling="greedy"
        onClick={(e) => {
          if (e.detail.latLng) onChange(e.detail.latLng);
        }}
      >
        {value && (
          <AdvancedMarker
            position={value}
            draggable
            onDragEnd={(e) => {
              const p = e.latLng?.toJSON();
              if (p) onChange(p);
            }}
          >
            <Pin background="#1e5a46" borderColor="#123c2e" glyphColor="#ffffff" />
          </AdvancedMarker>
        )}
      </Map>
    </div>
  );
}
