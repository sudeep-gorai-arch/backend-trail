/** Stable, non-sensitive errors for Google Play Developer API calls.
 * Never return upstream response bodies, service-account keys, or purchase tokens.
 */
export const classifyGooglePlayHttpError = (status: number) => {
  if (status === 401 || status === 403) {
    return {
      statusCode: 503,
      message: 'Google Play verification is unavailable: backend API access is not authorized. Check the service account permissions and Google Play Developer API access.',
      code: 'GOOGLE_PLAY_API_ACCESS',
    };
  }
  if (status === 404 || status === 410) {
    return {
      statusCode: 400,
      message: 'Google Play could not find this purchase. Check the Google Play account, application package and purchase state.',
      code: 'GOOGLE_PLAY_PURCHASE_NOT_FOUND',
    };
  }
  if (status === 429 || status >= 500) {
    return {
      statusCode: 503,
      message: 'Google Play verification is temporarily unavailable. Retry Restore Purchase later; do not purchase again.',
      code: 'GOOGLE_PLAY_API_UNAVAILABLE',
    };
  }
  return {
    statusCode: 400,
    message: 'Google Play rejected this purchase verification request.',
    code: 'GOOGLE_PLAY_INVALID_PURCHASE',
  };
};
