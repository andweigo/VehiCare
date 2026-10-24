/*
|--------------------------------------------------------------------------
| PROFILE PHOTO HELPERS
|--------------------------------------------------------------------------
|
| The image picker returns URIs that point into the app's private cache
| (file://, content://). Those paths only exist on the device and install
| that created them: reinstalling or updating the APK, clearing the cache,
| or signing in on another phone leaves the saved path pointing at nothing,
| which renders as an empty avatar. Only remote URLs and inline data URIs
| survive, so those are the only values we persist or display.
*/

const DEVICE_LOCAL_URI = /^(file|content|ph|assets-library):\/\//i;
const REMOTE_URI = /^https?:\/\//i;
const DATA_IMAGE_URI = /^data:image\/[a-z0-9.+-]+;base64,/i;

// Picker settings that keep the inline photo small (~20-60 KB).
export const PROFILE_PHOTO_PICKER_OPTIONS = {
  mediaType: 'photo',
  quality: 0.7,
  maxWidth: 320,
  maxHeight: 320,
  selectionLimit: 1,
  includeBase64: true,
};

export const isDeviceLocalUri = uri =>
  typeof uri === 'string' && DEVICE_LOCAL_URI.test(uri.trim());

export const isDataImageUri = uri =>
  typeof uri === 'string' && DATA_IMAGE_URI.test(uri.trim());

export const isPersistablePhotoUri = uri => {
  if (typeof uri !== 'string') {
    return false;
  }
  const value = uri.trim();
  return REMOTE_URI.test(value) || DATA_IMAGE_URI.test(value);
};

export const isDisplayablePhotoUri = uri => {
  if (typeof uri !== 'string') {
    return false;
  }
  const value = uri.trim();
  return (
    REMOTE_URI.test(value) ||
    DATA_IMAGE_URI.test(value) ||
    DEVICE_LOCAL_URI.test(value)
  );
};

/** Returns the first displayable photo for a user. */
export const resolveProfilePhoto = user => {
  if (!user) {
    return null;
  }

  const candidates = [user.photoURL, user.photo_url, user.avatar];
  const match = candidates.find(isDisplayablePhotoUri);
  return match ? match.trim() : null;
};

/** Converts an image-picker asset into a displayable/persistable photo URI. */
export const toPersistablePhoto = asset => {
  if (!asset) {
    return null;
  }

  if (asset.base64) {
    const mime =
      typeof asset.type === 'string' && asset.type.startsWith('image/')
        ? asset.type
        : 'image/jpeg';
    return `data:${mime};base64,${asset.base64}`;
  }

  return asset.uri && isDisplayablePhotoUri(asset.uri) ? asset.uri : null;
};
