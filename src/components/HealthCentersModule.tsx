import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import {
  Building2,
  Clock,
  Compass,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  Filter,
  HeartHandshake,
  Loader2,
  MapPin,
  Navigation,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import {
  CenterType,
  HealthCenter,
  HUANUCO_DEFAULT_CENTER,
  HUANUCO_HEALTH_CENTERS,
  PRE_APPOINTMENT_TIPS,
} from '../data/jamakissData';

interface HealthCentersModuleProps {
  discreetMode: boolean;
  onToggleDiscreetMode: () => void;
  onOpenScreeningSheet: (centerName?: string) => void;
}

interface UserCoords {
  lat: number;
  lng: number;
  accuracy?: number;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export const HealthCentersModule: React.FC<HealthCentersModuleProps> = ({
  discreetMode,
  onToggleDiscreetMode,
  onOpenScreeningSheet,
}) => {
  const [userCoords, setUserCoords] = useState<UserCoords | null>(null);
  const [geoStatus, setGeoStatus] = useState<'idle' | 'requesting' | 'granted' | 'denied'>('idle');
  const [geoMessage, setGeoMessage] = useState<string>('');

  const [typeFilter, setTypeFilter] = useState<'all' | CenterType>('all');
  const [onlyYouthFriendly, setOnlyYouthFriendly] = useState<boolean>(false);
  const [districtFilter, setDistrictFilter] = useState<'Todos' | 'Huánuco' | 'Amarilis' | 'Pillco Marca'>('Todos');
  const [selectedCenterId, setSelectedCenterId] = useState<string>(HUANUCO_HEALTH_CENTERS[0].id);

  // Centros descubiertos en vivo alrededor del GPS vía OpenStreetMap (Overpass)
  const [liveCenters, setLiveCenters] = useState<HealthCenter[]>([]);
  const [loadingLive, setLoadingLive] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  const referenceCoords = userCoords || {
    lat: HUANUCO_DEFAULT_CENTER.lat,
    lng: HUANUCO_DEFAULT_CENTER.lng,
  };

  const allCenters = useMemo(() => {
    const merged = [...HUANUCO_HEALTH_CENTERS, ...liveCenters];
    return merged.map((c) => ({
      ...c,
      distanceKm: haversineKm(referenceCoords.lat, referenceCoords.lng, c.lat, c.lng),
    }));
  }, [liveCenters, referenceCoords.lat, referenceCoords.lng]);

  const filteredCenters = useMemo(() => {
    return allCenters
      .filter((c) => (typeFilter === 'all' ? true : c.type === typeFilter))
      .filter((c) => (onlyYouthFriendly ? c.youthFriendly : true))
      .filter((c) => (districtFilter === 'Todos' ? true : c.district === districtFilter))
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }, [allCenters, typeFilter, onlyYouthFriendly, districtFilter]);

  const requestUserLocation = () => {
    if (!('geolocation' in navigator)) {
      setGeoStatus('denied');
      setGeoMessage('Tu navegador no soporta geolocalización. Mostrando centros verificados de Huánuco.');
      return;
    }

    setGeoStatus('requesting');
    setGeoMessage('Solicitando permiso de ubicación...');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords: UserCoords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy),
        };
        setUserCoords(coords);
        setGeoStatus('granted');
        setGeoMessage(
          `Ubicación activada (±${coords.accuracy} m). Ordenamos los establecimientos por cercanía y habilitamos rutas directas en Google Maps.`
        );
        if (mapRef.current) {
          mapRef.current.setView([coords.lat, coords.lng], 14, { animate: true });
        }
      },
      (err) => {
        setGeoStatus('denied');
        if (err.code === err.PERMISSION_DENIED) {
          setGeoMessage(
            'Permiso de ubicación denegado. Puedes activarlo en tu navegador o usar el directorio verificado de Huánuco.'
          );
        } else {
          setGeoMessage('No se pudo obtener señal GPS en este momento. Mostrando referencia de Huánuco Centro.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  /**
   * Consulta en vivo a OpenStreetMap (Overpass API) para descubrir clínicas/centros adicionales
   * cerca de la ubicación actual (útil si la usuaria está en otro punto o busca más opciones).
   */
  const fetchLiveNearbyClinics = async () => {
    setLoadingLive(true);
    try {
      const { lat, lng } = referenceCoords;
      const query = `[out:json][timeout:12];(node["amenity"~"clinic|hospital|doctors"](around:4500,${lat},${lng});way["amenity"~"clinic|hospital|doctors"](around:4500,${lat},${lng}););out center 12;`;
      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: `data=${encodeURIComponent(query)}`,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
      if (!response.ok) throw new Error('Overpass error');
      const json = await response.json();

      const existingNames = new Set(HUANUCO_HEALTH_CENTERS.map((c) => c.name.toLowerCase()));
      const discovered: HealthCenter[] = [];

      for (const el of json.elements || []) {
        const name = el.tags?.name?.trim();
        if (!name || existingNames.has(name.toLowerCase())) continue;
        const cLat = el.lat ?? el.center?.lat;
        const cLng = el.lon ?? el.center?.lon;
        if (typeof cLat !== 'number' || typeof cLng !== 'number') continue;

        existingNames.add(name.toLowerCase());
        const isPublic =
          /centro de salud|puesto de salud|hospital|minsa|essalud|posta/i.test(name);

        discovered.push({
          id: `osm-${el.id}`,
          name,
          shortTypeLabel: isPublic ? 'Detectado en Mapa • Público' : 'Detectado en Mapa • Clínica / Consultorio',
          type: isPublic ? 'publico_sis' : 'privado',
          youthFriendly: isPublic,
          district: 'Huánuco',
          address: el.tags?.['addr:street']
            ? `${el.tags['addr:street']} ${el.tags['addr:housenumber'] || ''}`.trim()
            : 'Ubicación detectada cerca de tu zona',
          lat: cLat,
          lng: cLng,
          schedule: el.tags?.opening_hours || 'Consultar horario en Google Maps',
          services: ['Atención Médica / Salud', 'Verificar Obstetricia'],
          costNote: isPublic ? 'Establecimiento público / Verificar SIS' : 'Clínica o consultorio particular',
        });
      }

      setLiveCenters(discovered.slice(0, 8));
      setGeoMessage(
        discovered.length > 0
          ? `Se encontraron ${discovered.length} establecimientos adicionales en el mapa cerca de tu ubicación.`
          : 'No aparecieron establecimientos adicionales en esta zona; puedes usar el botón de Google Maps para ver más opciones en tiempo real.'
      );
    } catch {
      setGeoMessage(
        'Mostrando directorio curado de Huánuco. Puedes usar el botón de Google Maps para explorar clínicas en tiempo real.'
      );
    } finally {
      setLoadingLive(false);
    }
  };

  // Inicializar mapa Leaflet
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [HUANUCO_DEFAULT_CENTER.lat, HUANUCO_DEFAULT_CENTER.lng],
      zoom: 14,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(map);

    markersLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Actualizar pines en mapa Leaflet
  useEffect(() => {
    const layer = markersLayerRef.current;
    const map = mapRef.current;
    if (!layer || !map) return;

    layer.clearLayers();

    if (userCoords) {
      L.circleMarker([userCoords.lat, userCoords.lng], {
        radius: 9,
        fillColor: '#0284C7',
        color: '#FFFFFF',
        weight: 3,
        fillOpacity: 0.95,
      })
        .bindPopup('<strong>Tu ubicación actual</strong>')
        .addTo(layer);
    }

    filteredCenters.forEach((center) => {
      const isSelected = center.id === selectedCenterId;
      const color = discreetMode
        ? '#334155'
        : center.type === 'publico_sis'
        ? '#0F766E'
        : '#8D0F42';

      const marker = L.circleMarker([center.lat, center.lng], {
        radius: isSelected ? 10 : 7,
        fillColor: color,
        color: '#FFFFFF',
        weight: isSelected ? 3 : 2,
        fillOpacity: 0.95,
      }).addTo(layer);

      const popupHtml = discreetMode
        ? `<div style="font-family:Inter,sans-serif;font-size:12px;"><strong>${center.name}</strong><br/><span style="color:#64748b">${center.address}</span></div>`
        : `<div style="font-family:Inter,sans-serif;font-size:12px;"><strong>${center.name}</strong><br/><span style="color:#720E36">${center.shortTypeLabel}</span><br/><span style="color:#594A51">${center.address}</span></div>`;

      marker.bindPopup(popupHtml);
      marker.on('click', () => setSelectedCenterId(center.id));
    });
  }, [filteredCenters, selectedCenterId, userCoords, discreetMode]);

  const focusCenterOnMap = (center: HealthCenter) => {
    setSelectedCenterId(center.id);
    if (mapRef.current) {
      mapRef.current.setView([center.lat, center.lng], 16, { animate: true });
    }
  };

  const buildGoogleMapsRouteUrl = (center: HealthCenter) => {
    const dest = encodeURIComponent(`${center.name}, ${center.address}, Huánuco, Perú`);
    if (userCoords) {
      return `https://www.google.com/maps/dir/?api=1&origin=${userCoords.lat},${userCoords.lng}&destination=${center.lat},${center.lng}&travelmode=walking`;
    }
    return `https://www.google.com/maps/search/?api=1&query=${dest}`;
  };

  const googleMapsLiveSearchUrl = userCoords
    ? `https://www.google.com/maps/search/consultorio+ginecologia+obstetricia+centro+de+salud/@${userCoords.lat},${userCoords.lng},15z`
    : `https://www.google.com/maps/search/consultorio+ginecologia+obstetricia+centro+de+salud+Huanuco+Peru`;

  return (
    <div className="space-y-6 fade-in-up">
      {/* Cabecera limpia */}
      <div className="rounded-3xl bg-white border border-[#EFE2E6] p-5 sm:p-6 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-brand text-xl sm:text-2xl font-bold tracking-tight text-[#5E0E26]">
            {discreetMode
              ? 'Establecimientos de Salud en Huánuco'
              : 'Centros de atención obstétrica en Huánuco'}
          </h1>
          <p className="text-xs sm:text-sm text-[#6A4F59] max-w-2xl">
            Activa tu ubicación GPS para ordenar centros de salud MINSA/SIS y clínicas cercanas por distancia, o abre la ruta directo en Google Maps.
          </p>
        </div>

        {/* Botones de GPS y Google Maps */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={requestUserLocation}
            disabled={geoStatus === 'requesting'}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#8E1436] hover:bg-[#72112E] text-white text-xs font-semibold shadow-sm transition-colors disabled:opacity-70"
          >
            {geoStatus === 'requesting' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Navigation className="w-4 h-4" />
            )}
            {userCoords ? 'Actualizar mi GPS' : 'Activar mi ubicación'}
          </button>

          <a
            href={googleMapsLiveSearchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-white hover:bg-[#FFF5F8] border border-[#E5D5DC] text-xs font-semibold text-[#28161C] transition-colors"
          >
            <Compass className="w-4 h-4 text-[#8E1436]" />
            Google Maps
            <ExternalLink className="w-3.5 h-3.5 text-[#8A6D77]" />
          </a>
        </div>
      </div>

      {/* Estado de geolocalización */}
      {geoMessage && (
        <div
          className={`rounded-2xl px-4 py-3 text-xs flex flex-wrap items-center justify-between gap-2 border ${
            geoStatus === 'granted'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : geoStatus === 'denied'
              ? 'bg-amber-50 border-amber-200 text-amber-900'
              : 'bg-sky-50 border-sky-200 text-sky-900'
          }`}
        >
          <span className="inline-flex items-center gap-2">
            <MapPin className="w-4 h-4 shrink-0" />
            {geoMessage}
          </span>
          <button
            type="button"
            onClick={fetchLiveNearbyClinics}
            disabled={loadingLive}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/90 hover:bg-white border border-black/10 text-[11px] font-semibold text-[#2B0C18] transition-colors"
          >
            {loadingLive ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Explorar clínicas extra en mapa
          </button>
        </div>
      )}

      {/* Filtros Inteligentes */}
      <div className="bg-white rounded-2xl border border-[#EFE3E8] p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#7D6670] mr-1">
            <Filter className="w-3.5 h-3.5" />
            Filtros:
          </span>

          <button
            type="button"
            onClick={() => setTypeFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
              typeFilter === 'all'
                ? 'bg-[#8E1436] text-white border-[#8E1436]'
                : 'bg-[#FAF8F5] text-[#5B454D] border-[#EFE4E8] hover:border-[#D9BAC5]'
            }`}
          >
            Todos ({allCenters.length})
          </button>

          <button
            type="button"
            onClick={() => setTypeFilter('publico_sis')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
              typeFilter === 'publico_sis'
                ? 'bg-[#8E1436] text-white border-[#8E1436]'
                : 'bg-[#FAF8F5] text-[#5B454D] border-[#EFE4E8] hover:border-[#D9BAC5]'
            }`}
          >
            Público / SIS (Gratuito)
          </button>

          <button
            type="button"
            onClick={() => setTypeFilter('privado')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
              typeFilter === 'privado'
                ? 'bg-[#8E1436] text-white border-[#8E1436]'
                : 'bg-[#FAF8F5] text-[#5B454D] border-[#EFE4E8] hover:border-[#D9BAC5]'
            }`}
          >
            Privado
          </button>

          {!discreetMode && (
            <button
              type="button"
              onClick={() => setOnlyYouthFriendly((v) => !v)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                onlyYouthFriendly
                  ? 'bg-[#8E1436] text-white border-[#8E1436]'
                  : 'bg-[#FAF8F5] text-[#5B454D] border-[#EFE4E8] hover:border-[#D9BAC5]'
              }`}
            >
              Atención Juvenil
            </button>
          )}
        </div>

        {/* Filtro de distrito (scrollable en celular) */}
        <div className="flex items-center gap-1.5 text-xs overflow-x-auto no-scrollbar max-w-full">
          {(['Todos', 'Huánuco', 'Amarilis', 'Pillco Marca'] as const).map((dist) => (
            <button
              key={dist}
              type="button"
              onClick={() => setDistrictFilter(dist)}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                districtFilter === dist
                  ? 'bg-[#FFF0F5] text-[#8D0F42] border border-[#F5C5D8]'
                  : 'text-[#7D6670] hover:text-[#2B0C18]'
              }`}
            >
              {dist}
            </button>
          ))}
        </div>
      </div>

      {/* Mapa + Lista */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Lista de establecimientos (fluye natural en celular sin scroll atrapado) */}
        <div className="lg:col-span-6 space-y-3 lg:max-h-[540px] lg:overflow-y-auto lg:pr-1">
          {filteredCenters.map((center) => {
            const isSelected = center.id === selectedCenterId;
            return (
              <div
                key={center.id}
                onClick={() => focusCenterOnMap(center)}
                className={`cursor-pointer rounded-2xl border p-4 transition-all bg-white space-y-3 ${
                  isSelected
                    ? 'border-[#8D0F42] ring-2 ring-[#8D0F42]/20 shadow-sm'
                    : 'border-[#EFE3E8] hover:border-[#E75690]'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-[#28161C]">{center.name}</h3>
                    <p className="text-[11px] text-[#7A616A] mt-0.5">
                      {center.shortTypeLabel}
                      {center.youthFriendly && !discreetMode ? ' · Atención juvenil' : ''}
                    </p>
                    <p className="text-xs text-[#5B454D] mt-1.5 flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 shrink-0 text-[#8A6D77]" />
                      {center.address}
                    </p>
                  </div>

                  <span className="shrink-0 text-xs font-mono font-semibold text-[#7A616A]">
                    {center.distanceKm} km
                  </span>
                </div>

                <div className="text-[11px] text-[#6A4F59] flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-[#8E1436]" />
                    {center.schedule}
                  </span>
                  <span className="text-[#8A6D77]">{center.costNote}</span>
                </div>

                {!discreetMode && (
                  <p className="text-[11px] text-[#7A616A] leading-relaxed">
                    <span className="font-medium text-[#5B454D]">Servicios:</span>{' '}
                    {center.services.join(' · ')}
                  </p>
                )}

                <div className="pt-2 border-t border-[#F3E6EC] flex flex-wrap items-center gap-2">
                  <a
                    href={buildGoogleMapsRouteUrl(center)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#8D0F42] hover:bg-[#720E36] text-white text-[11px] font-semibold transition-colors"
                  >
                    <Navigation className="w-3 h-3" />
                    Cómo llegar en Google Maps
                  </a>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenScreeningSheet(center.name);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FFF0F5] hover:bg-[#FCE1EB] text-[#720E36] border border-[#F5C5D8] text-[11px] font-semibold transition-colors"
                  >
                    <FileText className="w-3 h-3" />
                    Llevar mi Ficha de Tamizaje
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Mapa Interactivo + Tips Previos */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-white rounded-3xl border border-[#EFE3E8] overflow-hidden shadow-xs">
            <div className="px-4 py-3 border-b border-[#EFE6EA] flex items-center justify-between text-xs">
              <span className="font-semibold text-[#2B0C18] inline-flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#B31353]" />
                {discreetMode ? 'Mapa de Ruta Estándar' : 'Mapa Interactivo de Huánuco'}
              </span>
              <span className="text-[11px] text-[#8C737E]">
                {userCoords ? 'Centrado en tu GPS' : 'Referencia: Plaza de Armas, Huánuco'}
              </span>
            </div>
            <div ref={mapContainerRef} className="w-full h-[260px] sm:h-[340px] z-10" />
          </div>

          {/* 3 Tips de Preparación Previa antes de ir */}
          <div className="bg-gradient-to-br from-[#FFF7FA] to-white rounded-3xl border border-[#F5D6E3] p-5 space-y-3">
            <div className="flex items-center gap-2 text-[#720E36]">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <h3 className="text-sm font-bold">
                3 Tips rápidos antes de acudir a tu consulta
              </h3>
            </div>
            <div className="space-y-2.5">
              {PRE_APPOINTMENT_TIPS.map((tip, idx) => (
                <div key={tip.title} className="flex items-start gap-2.5 text-xs">
                  <span className="w-5 h-5 rounded-full bg-[#8D0F42] text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <div>
                    <p className="font-semibold text-[#2B0C18]">{tip.title}</p>
                    <p className="text-[#594A51] leading-relaxed">{tip.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

