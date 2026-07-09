import { useCallback, useState } from 'react';
import { uploadImage } from '../api.js';
import type { ImageAsset } from '../types.js';

export function useCoverUpload(onSuccess: (asset: ImageAsset) => void) {
  const [uploadingCover, setUploadingCover] = useState(false);

  const uploadCover = useCallback(
    async (file: File) => {
      setUploadingCover(true);
      try {
        const uploaded = await uploadImage(file);
        onSuccess(uploaded);
      } finally {
        setUploadingCover(false);
      }
    },
    [onSuccess],
  );

  return { uploadingCover, uploadCover };
}
