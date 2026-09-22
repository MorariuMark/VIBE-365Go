'use client';

import React, { useState, useEffect, useRef } from 'react';
import { PhotoMetadata } from '@/types';
import { getTodayISO, formatDatePretty } from '@/lib/utils';
import { compressAndDownscaleImage } from '@/lib/imageCompressor';
import { savePhotoToVault, getPhotoFromVault, deletePhotoFromVault } from '@/lib/photoStorage';
import {
  Camera,
  Upload,
  Calendar,
  Clock,
  Trash2,
  Maximize2,
  X,
  Sparkles,
  Zap,
  Image as ImageIcon,
  CheckCircle2,
  ArrowRight,
  Filter,
  Layers,
  Info,
} from 'lucide-react';

interface DailyFitnessPhotosProps {
  selectedDate: string;
  onSelectDate: (dateISO: string) => void;
  fitnessPhotos: Record<string, PhotoMetadata[]>;
  onSavePhotoMetadata: (metadata: PhotoMetadata) => void;
  onDeletePhotoMetadata: (photoId: string, dateISO: string) => void;
}

interface LoadedPhoto {
  metadata: PhotoMetadata;
  dataUrl: string;
}

export const DailyFitnessPhotos: React.FC<DailyFitnessPhotosProps> = ({
  selectedDate,
  onSelectDate,
  fitnessPhotos,
  onSavePhotoMetadata,
  onDeletePhotoMetadata,
}) => {
  const [filterMode, setFilterMode] = useState<'selected_day' | 'all_time'>('selected_day');
  const [captionInput, setCaptionInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [loadedPhotos, setLoadedPhotos] = useState<LoadedPhoto[]>([]);
  const [isLoadingPhotos, setIsLoadingPhotos] = useState(true);
  const [activePreview, setActivePreview] = useState<LoadedPhoto | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Gather list of photo metadata based on filter mode
  const currentPhotosMeta: PhotoMetadata[] = React.useMemo(() => {
    if (filterMode === 'selected_day') {
      return fitnessPhotos[selectedDate] || [];
    }
    // All time: flatten all entries sorted by uploadedAt descending
    const all: PhotoMetadata[] = [];
    Object.values(fitnessPhotos).forEach((list) => {
      if (Array.isArray(list)) {
        all.push(...list);
      }
    });
    return all.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
  }, [fitnessPhotos, selectedDate, filterMode]);

  // Load photos from IndexedDB whenever currentPhotosMeta changes
  useEffect(() => {
    let isCancelled = false;
    async function loadPhotos() {
      setIsLoadingPhotos(true);
      const results: LoadedPhoto[] = [];
      for (const meta of currentPhotosMeta) {
        try {
          const url = await getPhotoFromVault(meta.id, meta);
          if (url && !isCancelled) {
            results.push({ metadata: meta, dataUrl: url });
          }
        } catch (err) {
          console.warn(`Could not load photo ${meta.id}`, err);
        }
      }
      if (!isCancelled) {
        setLoadedPhotos(results);
        setIsLoadingPhotos(false);
      }
    }
    loadPhotos();
    return () => {
      isCancelled = true;
    };
  }, [currentPhotosMeta]);

  // Handle image upload and compression
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsProcessing(true);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) continue;

      try {
        setProcessingStatus(
          `Optimizing & compressing photo (${file.name}, ${(file.size / (1024 * 1024)).toFixed(1)} MB)...`
        );

        // Run client-side downscaler and compressor strictly targeting < 1MB
        const result = await compressAndDownscaleImage(file, {
          maxDimension: 1600,
          targetMaxKB: 950, // strictly under 1MB
          initialQuality: 0.82,
          category: 'fitness',
          caption: captionInput.trim() || undefined,
          dateISO: selectedDate,
        });

        setProcessingStatus('Securing in cloud & local photo vault...');
        // Save to IndexedDB and upload to Supabase Storage
        await savePhotoToVault(result.metadata.id, result.dataUrl, result.metadata);
        // Save metadata (including cloud publicUrl) to application state
        onSavePhotoMetadata(result.metadata);
      } catch (err) {
        console.error('Failed to process image:', err);
        alert(`Failed to compress image: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    setCaptionInput('');
    setIsProcessing(false);
    setProcessingStatus('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Delete photo handler
  const handleDeletePhoto = async (photo: LoadedPhoto) => {
    const confirmDelete = window.confirm(
      `Delete this progress photo from ${photo.metadata.dateISO}?`
    );
    if (!confirmDelete) return;

    try {
      await deletePhotoFromVault(photo.metadata.id, photo.metadata.storagePath);
      onDeletePhotoMetadata(photo.metadata.id, photo.metadata.dateISO);
      if (activePreview?.metadata.id === photo.metadata.id) {
        setActivePreview(null);
      }
    } catch (err) {
      console.error('Failed to delete photo:', err);
    }
  };

  // Calculate savings stats
  const totalPhotosCount = Object.values(fitnessPhotos || {}).reduce(
    (acc, list) => acc + (Array.isArray(list) ? list.length : 0),
    0
  );
  const totalOrigKB = Object.values(fitnessPhotos || {}).reduce(
    (acc, list) =>
      acc + (Array.isArray(list) ? list.reduce((sub, p) => sub + (p.originalSizeKB || 0), 0) : 0),
    0
  );
  const totalCompKB = Object.values(fitnessPhotos || {}).reduce(
    (acc, list) =>
      acc + (Array.isArray(list) ? list.reduce((sub, p) => sub + (p.compressedSizeKB || 0), 0) : 0),
    0
  );
  const totalSavedMB = Math.max(0, (totalOrigKB - totalCompKB) / 1024).toFixed(1);
  const compressionRatioPct =
    totalOrigKB > 0 ? Math.round(((totalOrigKB - totalCompKB) / totalOrigKB) * 100) : 0;

  // Format aspect ratio helper
  const getAspectRatioLabel = (w: number, h: number) => {
    if (!w || !h) return 'HD';
    const ratio = w / h;
    if (Math.abs(ratio - 1) < 0.05) return '1:1 Square';
    if (Math.abs(ratio - 4 / 3) < 0.08 || Math.abs(ratio - 3 / 4) < 0.08) return '4:3 Standard';
    if (Math.abs(ratio - 16 / 9) < 0.08 || Math.abs(ratio - 9 / 16) < 0.08) return '16:9 Wide';
    return `${w}:${h}`;
  };

  // Format time of upload
  const formatTimeOfUpload = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Compression Engine HUD */}
      <div className="athletic-card rounded-2xl p-5 border border-[#1b2233] bg-gradient-to-br from-[#0c101a] via-[#090c14] to-[#0d121f]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <Camera className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <span>Daily Physique & Visual Progress Vault</span>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-950/80 text-blue-400 border border-blue-800/40 uppercase">
                    &lt;1MB Engine
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  High-fidelity daily physique tracking with automated aspect-ratio downscaling &amp; compression.
                </p>
              </div>
            </div>
          </div>

          {/* Savings HUD Cards */}
          <div className="flex items-center gap-2.5 sm:gap-4 overflow-x-auto pb-1 sm:pb-0">
            <div className="bg-[#0e121e] border border-[#1d2539] px-3.5 py-2 rounded-xl flex flex-col">
              <span className="text-[10px] font-mono text-slate-400 uppercase">Vault Photos</span>
              <span className="text-sm sm:text-base font-bold text-white font-numeric">
                {totalPhotosCount}
              </span>
            </div>
            <div className="bg-[#0e121e] border border-[#1d2539] px-3.5 py-2 rounded-xl flex flex-col">
              <span className="text-[10px] font-mono text-slate-400 uppercase">Data Saved</span>
              <span className="text-sm sm:text-base font-bold text-emerald-400 font-numeric">
                {totalSavedMB} MB ({compressionRatioPct}%)
              </span>
            </div>
            <div className="bg-[#0e121e] border border-[#1d2539] px-3.5 py-2 rounded-xl flex flex-col">
              <span className="text-[10px] font-mono text-slate-400 uppercase">Per Photo Cap</span>
              <span className="text-sm sm:text-base font-bold text-blue-400 font-mono">
                &lt; 950 KB
              </span>
            </div>
          </div>
        </div>

        {/* Algorithm specs banner */}
        <div className="mt-4 pt-3.5 border-t border-[#161c2c] flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400 font-mono">
          <div className="flex items-center gap-1.5 text-blue-400">
            <Sparkles className="w-3.5 h-3.5" />
            <span>iPhone 12 (12MP 4032x3024) Proportional Downscaler Active</span>
          </div>
          <div className="flex items-center gap-3">
            <span>Aspect Ratio: 100% Preserved</span>
            <span>•</span>
            <span>Storage: IndexedDB Local Vault</span>
          </div>
        </div>
      </div>

      {/* Upload Zone Card */}
      <div
        className={`athletic-card rounded-2xl p-5 border transition-all duration-200 ${
          isDragOver
            ? 'border-blue-500 bg-blue-950/20'
            : 'border-[#1b2233] bg-[#0c101a] hover:border-[#26314a]'
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          handleFileUpload(e.dataTransfer.files);
        }}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Upload className="w-4 h-4 text-blue-400" />
              <span>Upload Daily Progress Picture</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                Target Date: {selectedDate}
              </span>
            </h4>
            <p className="text-xs text-slate-400">
              Drag and drop front, back, or side progress photos. They will be downscaled and compressed seamlessly.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <input
              type="text"
              placeholder="Optional caption (e.g. Morning fasting check)"
              value={captionInput}
              onChange={(e) => setCaptionInput(e.target.value)}
              className="px-3 py-2 rounded-xl bg-[#121724] border border-[#212b40] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 flex-1 sm:w-64"
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => handleFileUpload(e.target.files)}
              className="hidden"
              id="fitness-photo-upload"
            />
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-400 text-slate-950 font-bold text-xs transition active-press disabled:opacity-50 whitespace-nowrap shadow-sm"
            >
              {isProcessing ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Camera className="w-4 h-4 stroke-[2.5]" />
                  <span>Choose Photo</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Processing status readout */}
        {isProcessing && (
          <div className="mt-3 p-3 rounded-xl bg-blue-950/40 border border-blue-800/40 flex items-center gap-3 text-xs text-blue-300 font-mono animate-pulse">
            <Zap className="w-4 h-4 text-blue-400 flex-shrink-0" />
            <span>{processingStatus || 'Downscaling resolution & compressing below 1MB...'}</span>
          </div>
        )}
      </div>

      {/* Filter & View Mode Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2 bg-[#0c101a] border border-[#1b2233] p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setFilterMode('selected_day')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              filterMode === 'selected_day'
                ? 'bg-[#1b2234] text-white border border-[#2b3752]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 text-blue-400" />
            <span>Selected Day ({selectedDate})</span>
            <span className="text-[10px] font-mono px-1.5 rounded bg-black/40 text-slate-400">
              {(fitnessPhotos[selectedDate] || []).length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilterMode('all_time')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              filterMode === 'all_time'
                ? 'bg-[#1b2234] text-white border border-[#2b3752]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            <span>All Timeline</span>
            <span className="text-[10px] font-mono px-1.5 rounded bg-black/40 text-slate-400">
              {totalPhotosCount}
            </span>
          </button>
        </div>

        <div className="text-xs text-slate-400 font-mono">
          Showing {loadedPhotos.length} {loadedPhotos.length === 1 ? 'photo' : 'photos'}
        </div>
      </div>

      {/* Photos Grid */}
      {isLoadingPhotos ? (
        <div className="p-12 text-center text-slate-500 font-mono text-xs flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span>LOADING PHOTO VAULT...</span>
        </div>
      ) : loadedPhotos.length === 0 ? (
        <div className="athletic-card rounded-2xl p-10 text-center border border-[#1b2233] bg-[#0c101a] space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mx-auto">
            <ImageIcon className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-white">No Progress Photos Found</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {filterMode === 'selected_day'
              ? `No visual progress pictures recorded for ${selectedDate}. Snap a photo to track your transformation.`
              : 'No progress photos found in your vault. Start taking daily photos to track your journey.'}
          </p>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs font-semibold transition"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Upload First Photo</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {loadedPhotos.map((item) => {
            const ratioPct =
              item.metadata.originalSizeKB > 0
                ? Math.round(
                    ((item.metadata.originalSizeKB - item.metadata.compressedSizeKB) /
                      item.metadata.originalSizeKB) *
                      100
                  )
                : 0;

            return (
              <div
                key={item.metadata.id}
                className="group athletic-card rounded-2xl overflow-hidden border border-[#1b2233] bg-[#0c101a] hover:border-blue-500/50 transition-all flex flex-col"
              >
                {/* Image Container */}
                <div
                  className="relative aspect-[3/4] bg-black/80 overflow-hidden cursor-pointer flex items-center justify-center"
                  onClick={() => setActivePreview(item)}
                >
                  <img
                    src={item.dataUrl}
                    alt={item.metadata.caption || 'Fitness Progress'}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />

                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />

                  {/* Top Metadata Badges */}
                  <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-black/70 text-white backdrop-blur-md border border-white/10 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-blue-400" />
                      <span>{item.metadata.dateISO}</span>
                    </span>

                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-black/70 text-slate-300 backdrop-blur-md border border-white/10 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>{formatTimeOfUpload(item.metadata.uploadedAt)}</span>
                    </span>
                  </div>

                  {/* Hover Actions */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActivePreview(item);
                      }}
                      className="p-2.5 rounded-xl bg-blue-500 hover:bg-blue-400 text-slate-950 font-bold transition shadow-lg"
                      title="View full resolution and metadata"
                    >
                      <Maximize2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePhoto(item);
                      }}
                      className="p-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white transition shadow-lg"
                      title="Delete photo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Bottom Image Info */}
                  <div className="absolute bottom-2.5 inset-x-2.5">
                    {item.metadata.caption && (
                      <p className="text-xs font-semibold text-white truncate mb-1 drop-shadow-md">
                        {item.metadata.caption}
                      </p>
                    )}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-950/90 text-emerald-400 border border-emerald-800/60 backdrop-blur-md">
                        {item.metadata.compressedSizeKB} KB
                      </span>
                      {ratioPct > 0 && (
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-blue-950/90 text-blue-300 border border-blue-800/60 backdrop-blur-md">
                          -{ratioPct}%
                        </span>
                      )}
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-black/80 text-slate-300 backdrop-blur-md">
                        {item.metadata.width}×{item.metadata.height}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Footer Metadata Readout */}
                <div className="p-3 border-t border-[#182033] bg-[#0e121e] flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span className="truncate">
                    {getAspectRatioLabel(item.metadata.width, item.metadata.height)}
                  </span>
                  <span className="text-slate-500 text-[10px]">
                    from {item.metadata.originalSizeKB} KB
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Fullscreen Photo & Metadata Modal */}
      {activePreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative max-w-4xl w-full bg-[#0b0e17] border border-[#1f283d] rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="px-5 py-3.5 border-b border-[#1b2233] flex items-center justify-between bg-[#0e121e]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <Camera className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">
                    {activePreview.metadata.caption || 'Daily Physique Photo'}
                  </h4>
                  <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
                    <span>{formatDatePretty(activePreview.metadata.dateISO)}</span>
                    <span>•</span>
                    <span>{formatTimeOfUpload(activePreview.metadata.uploadedAt)}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDeletePhoto(activePreview)}
                  className="p-2 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-950/50 border border-transparent hover:border-rose-800/40 transition text-xs font-medium flex items-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Delete</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActivePreview(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: Photo Canvas */}
            <div className="flex-1 bg-black/95 p-4 flex items-center justify-center overflow-auto min-h-[360px] max-h-[60vh]">
              <img
                src={activePreview.dataUrl}
                alt="Full resolution progress"
                className="max-h-[56vh] w-auto object-contain rounded-lg shadow-2xl border border-white/5"
              />
            </div>

            {/* Modal Footer: Deep Metadata Inspector */}
            <div className="p-4 sm:p-5 border-t border-[#1b2233] bg-[#0c1019]">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="bg-[#111624] border border-[#1e273c] p-2.5 rounded-xl">
                  <span className="text-[10px] font-mono text-slate-400 uppercase block">
                    Original iPhone 12 Size
                  </span>
                  <span className="text-sm font-bold text-slate-300 font-mono mt-0.5 block">
                    {activePreview.metadata.originalSizeKB} KB (
                    {(activePreview.metadata.originalSizeKB / 1024).toFixed(2)} MB)
                  </span>
                </div>

                <div className="bg-[#111624] border border-[#1e273c] p-2.5 rounded-xl">
                  <span className="text-[10px] font-mono text-slate-400 uppercase block">
                    Compressed Output (&lt;1MB)
                  </span>
                  <span className="text-sm font-bold text-emerald-400 font-mono mt-0.5 block">
                    {activePreview.metadata.compressedSizeKB} KB (
                    {(
                      ((activePreview.metadata.originalSizeKB -
                        activePreview.metadata.compressedSizeKB) /
                        activePreview.metadata.originalSizeKB) *
                      100
                    ).toFixed(0)}
                    % saved)
                  </span>
                </div>

                <div className="bg-[#111624] border border-[#1e273c] p-2.5 rounded-xl">
                  <span className="text-[10px] font-mono text-slate-400 uppercase block">
                    Downscaled Dimensions
                  </span>
                  <span className="text-sm font-bold text-white font-mono mt-0.5 block">
                    {activePreview.metadata.width} × {activePreview.metadata.height} px
                  </span>
                </div>

                <div className="bg-[#111624] border border-[#1e273c] p-2.5 rounded-xl">
                  <span className="text-[10px] font-mono text-slate-400 uppercase block">
                    Aspect Ratio &amp; Format
                  </span>
                  <span className="text-sm font-bold text-blue-400 font-mono mt-0.5 block">
                    {getAspectRatioLabel(activePreview.metadata.width, activePreview.metadata.height)}{' '}
                    • {activePreview.metadata.mimeType.split('/')[1]?.toUpperCase() || 'JPEG'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
