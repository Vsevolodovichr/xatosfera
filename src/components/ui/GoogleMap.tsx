import React, { useEffect, useRef } from 'react';

interface GoogleMapProps {
  lat: number;
  lng: number;
  onLocationSelect?: (lat: number, lng: number) => void;
  zoom?: number;
}

export const GoogleMap: React.FC<GoogleMapProps> = ({ lat, lng, onLocationSelect, zoom = 15 }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    const initialPos = { lat: lat || 48.5132, lng: lng || 32.2597 }; // Default Kropyvnytskyi
    
    googleMapRef.current = new google.maps.Map(mapRef.current, {
      center: initialPos,
      zoom: zoom,
      mapId: 'DEMO_MAP_ID',
    });

    markerRef.current = new google.maps.Marker({
      position: initialPos,
      map: googleMapRef.current,
      draggable: !!onLocationSelect,
    });

    if (onLocationSelect) {
      googleMapRef.current.addListener('click', (e: google.maps.MapMouseEvent) => {
        const newLat = e.latLng?.lat();
        const newLng = e.latLng?.lng();
        if (newLat && newLng) {
          markerRef.current?.setPosition({ lat: newLat, lng: newLng });
          onLocationSelect(newLat, newLng);
        }
      });
      
      markerRef.current.addListener('dragend', () => {
        const pos = markerRef.current?.getPosition();
        if (pos) {
          onLocationSelect(pos.lat(), pos.lng());
        }
      });
    }
  }, []);

  useEffect(() => {
    if (googleMapRef.current && lat && lng) {
      const pos = { lat, lng };
      googleMapRef.current.setCenter(pos);
      markerRef.current?.setPosition(pos);
    }
  }, [lat, lng]);

  return <div ref={mapRef} className="h-full w-full rounded-md border" style={{ minHeight: '300px' }} />;
};
