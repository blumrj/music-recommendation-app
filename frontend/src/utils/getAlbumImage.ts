const DEFAULT_ALBUM_COVER = "/win98-icons/cd_audio_cd-0.png";

/**
 * Get a valid album image URL with fallback
 * Returns the provided imageUrl if valid, otherwise returns the default CD icon
 */
export const getAlbumImage = (imageUrl: string | undefined): string => {
  return imageUrl && imageUrl.trim() ? imageUrl : DEFAULT_ALBUM_COVER;
};
