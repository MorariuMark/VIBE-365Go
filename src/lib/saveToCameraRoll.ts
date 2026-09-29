/**
 * Saves or shares an image to the user's Camera Roll / Device Gallery.
 * On mobile devices (iOS Safari, Android Chrome), uses the Web Share API with File objects,
 * which displays the native OS share sheet with the direct "Save Image" to Camera Roll option.
 * On desktop or unsupported platforms, downloads the image file directly.
 */
export async function saveImageToCameraRoll(
  dataUrl: string,
  filename = 'workout-photo.jpg'
): Promise<{ success: boolean; method: 'share' | 'download' | 'error'; message?: string }> {
  try {
    // 1. Convert Data URL to Blob
    let blob: Blob;
    if (dataUrl.startsWith('data:')) {
      const parts = dataUrl.split(',');
      const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
      const bstr = atob(parts[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      blob = new Blob([u8arr], { type: mime });
    } else {
      const response = await fetch(dataUrl);
      blob = await response.blob();
    }

    const mimeType = blob.type || 'image/jpeg';
    const extension = mimeType.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
    const cleanBaseName = filename.replace(/\.[^/.]+$/, '');
    const finalFilename = `${cleanBaseName}.${extension}`;
    const file = new File([blob], finalFilename, { type: mimeType });

    // 2. Try native mobile share (direct Save to Camera Roll option in iOS/Android OS)
    if (
      typeof navigator !== 'undefined' &&
      navigator.canShare &&
      navigator.canShare({ files: [file] })
    ) {
      try {
        await navigator.share({
          files: [file],
          title: 'Save to Camera Roll',
          text: 'VIBE 365 Fitness Photo',
        });
        return { success: true, method: 'share', message: 'Saved to Camera Roll / Photos' };
      } catch (shareErr: any) {
        // User dismissed share sheet
        if (shareErr.name === 'AbortError') {
          return { success: true, method: 'share', message: 'Share sheet closed' };
        }
        // Fall back to direct file download
      }
    }

    // 3. Fallback: Trigger browser file download (Desktop & fallback)
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = finalFilename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);

    return { success: true, method: 'download', message: 'Image downloaded to device' };
  } catch (err: any) {
    console.error('Error saving image to camera roll:', err);
    return { success: false, method: 'error', message: err?.message || 'Failed to save image' };
  }
}
