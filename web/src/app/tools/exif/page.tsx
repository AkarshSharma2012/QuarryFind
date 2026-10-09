"use client";

import { useState } from "react";
import { ExternalLink, ImageUp } from "lucide-react";
import { ToolShell, RecordsTable } from "@/components/tool-layout";
import { Card, EmptyState } from "@/components/ui/primitives";

type Tags = Record<string, unknown>;

const PICK: [string, string][] = [
  ["Make", "Camera make"], ["Model", "Camera model"], ["LensModel", "Lens"], ["Software", "Software"], ["DateTimeOriginal", "Taken"],
  ["CreateDate", "Created"], ["ModifyDate", "Modified"], ["OffsetTimeOriginal", "Time zone offset"], ["Artist", "Artist"], ["Copyright", "Copyright"],
  ["ImageDescription", "Description"], ["ExifImageWidth", "Width"], ["ExifImageHeight", "Height"], ["Orientation", "Orientation"],
  ["FNumber", "Aperture (f)"], ["ExposureTime", "Exposure (s)"], ["ISO", "ISO"], ["FocalLength", "Focal length (mm)"],
  ["GPSAltitude", "Altitude (m)"], ["HostComputer", "Device"], ["SerialNumber", "Body serial"], ["LensSerialNumber", "Lens serial"],
  ["OwnerName", "Owner"], ["CreatorTool", "Creator tool"], ["History", "Edit history"],
];

function fmt(v: unknown): string {
  if (v instanceof Date) return v.toISOString().replace("T", " ").replace(/\.\d+Z$/, " UTC");
  if (Array.isArray(v)) return v.map(fmt).join(", ");
  if (typeof v === "number") return Number.isInteger(v) ? String(v) : v.toFixed(4).replace(/0+$/, "");
  if (v && typeof v === "object") return JSON.stringify(v).slice(0, 200);
  return String(v);
}

export default function ExifTool() {
  const [file, setFile] = useState<File | null>(null);
  const [tags, setTags] = useState<Tags | null>(null);
  const [gps, setGps] = useState<{ latitude: number; longitude: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const read = async (f: File | undefined) => {
    if (!f) return;
    setFile(f); setTags(null); setGps(null); setError(null);
    setPreview((old) => { if (old) URL.revokeObjectURL(old); return URL.createObjectURL(f); });
    try {
      const exifr = (await import("exifr")).default;
      const t = (await exifr.parse(f, { tiff: true, exif: true, gps: true, xmp: true, iptc: true, icc: false })) as Tags | undefined;
      setTags(t ?? {});
      const g = await exifr.gps(f).catch(() => null);
      if (g && Number.isFinite(g.latitude)) setGps(g);
    } catch {
      setError("Couldn’t read metadata from this file. It may not be a photo, or the format isn’t supported.");
    }
  };

  const records = tags ? PICK.filter(([k]) => tags[k] !== undefined && tags[k] !== "").map(([k, label]) => ({ name: label, value: fmt(tags[k]) })) : [];

  return (
    <ToolShell slug="exif">
      <label
        className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed border-border-input bg-surface p-8 text-center hover:border-accent focus-within:outline-2 focus-within:outline-focus"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); read(e.dataTransfer.files[0]); }}
      >
        <ImageUp className="size-8 text-text-subtle" aria-hidden />
        <span className="text-sm text-text">Drop a photo here, or choose one</span>
        <span className="text-xs text-text-subtle">JPEG, HEIC, TIFF, PNG, WebP. Read on this device; the file is never uploaded.</span>
        <input type="file" accept="image/*,.heic,.heif,.tif,.tiff" className="sr-only" onChange={(e) => read(e.target.files?.[0])} />
      </label>

      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      {file && tags && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {preview && <img src={preview} alt="The photo you selected" className="size-20 rounded-md object-cover" />}
            <div className="text-sm"><p className="text-text">{file.name}</p><p className="text-text-subtle">{(file.size / 1024).toFixed(0)} KB · {file.type || "unknown type"}</p></div>
          </div>
          {gps && (
            <Card className="flex flex-col gap-1 p-4">
              <p className="text-sm text-warning">This photo contains a GPS location.</p>
              <p className="font-mono text-sm text-text">{gps.latitude.toFixed(6)}, {gps.longitude.toFixed(6)}</p>
              <a className="inline-flex items-center gap-1 text-sm text-accent hover:underline" target="_blank" rel="noopener noreferrer" href={`https://www.openstreetmap.org/?mlat=${gps.latitude}&mlon=${gps.longitude}#map=16/${gps.latitude}/${gps.longitude}`}>Open in OpenStreetMap <ExternalLink className="size-3.5" aria-hidden /></a>
            </Card>
          )}
          {records.length ? <RecordsTable records={records} /> : <Card><EmptyState title="No metadata found" body="The file has no EXIF data. Most social networks strip it on upload." /></Card>}
        </div>
      )}
    </ToolShell>
  );
}
