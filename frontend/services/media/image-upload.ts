import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { File } from 'expo-file-system';
import { apiRequest } from '../api/client';
import { isApiError } from '../api/api-error';
import { assertUserSession, type SessionScope } from '../auth/session-scope';

type Photo = { uri: string; width: number; height: number; fileSize?: number };

// Capture scope BEFORE opening the picker, never after it resolves.
export async function uploadPreparedImage<T>(asset: Photo, session: SessionScope, width: number,
  upload: ((file: Blob) => Promise<T>) | undefined, legacy: (data: string) => Promise<T>): Promise<T> {
  assertUserSession(session);
  if ((asset.fileSize ?? 0) > 10 * 1024 * 1024 || asset.width * asset.height > 40000000)
    throw new Error('Choose a photo smaller than 10 MB and 40 megapixels.');
  const context = ImageManipulator.manipulate(asset.uri);
  let file: File | undefined;
  try {
    context.resize(asset.width >= asset.height ? { width: Math.min(width, asset.width) } : { height: Math.min(width, asset.height) });
    const image = await context.renderAsync();
    try {
      const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.7 });
      file = new File(saved.uri);
      if (!file.size || file.size > 512000) throw new Error('Photo is too large. Choose a smaller, simpler photo.');
      assertUserSession(session);
      const useLegacy = async () => {
        const data = await file!.base64();
        assertUserSession(session);
        const result = await legacy(`data:image/jpeg;base64,${data}`);
        assertUserSession(session);
        return result;
      };
      if (!upload) return await useLegacy();
      try {
        const result = await upload(file);
        assertUserSession(session);
        return result;
      } catch (error) {
        assertUserSession(session);
        // Only an absent endpoint or an explicit disabled feature permits fallback.
        // Never retry a timeout/502 as a different upload: it may have succeeded.
        if (!isApiError(error) || (error.status !== 404 && error.code !== 'IMAGE_UPLOADS_DISABLED')) throw error;
        return await useLegacy();
      }
    } finally { image.release(); }
  } finally {
    context.release();
    // Only the new manipulator output is ours to remove, never the picker source.
    if (file && file.uri !== asset.uri) { try { file.delete(); } catch { /* OS cache cleanup can retry. */ } }
  }
}

export function uploadPublicImage(asset: Photo, session: SessionScope, path: string, width = 1200): Promise<string> {
  return uploadPreparedImage(asset, session, width, async imageBody => {
    const result = await apiRequest<{ url: string }>(path, { imageBody, timeoutMs: 35000 });
    if (typeof result.url !== 'string' || !result.url.startsWith('https://res.cloudinary.com/'))
      throw new Error('The server returned an invalid image. Please retry.');
    return result.url;
  }, async data => data);
}
