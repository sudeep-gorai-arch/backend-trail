import { GoogleAuth } from 'google-auth-library';

import { env } from './env';
import { ApiError } from '../utils/ApiError';
import { classifyGooglePlayHttpError } from '../utils/googlePlayErrors';

const ANDROID_PUBLISHER_SCOPE =
  'https://www.googleapis.com/auth/androidpublisher';
const API_ROOT =
  'https://androidpublisher.googleapis.com/androidpublisher/v3';

let auth: GoogleAuth | null = null;

const parseServiceAccount = () => {
  const raw = env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_BASE64
    ? Buffer.from(
        env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_BASE64,
        'base64',
      ).toString('utf8')
    : env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;

  if (!raw) {
    throw new ApiError(503, 'Google Play verification is unavailable: service-account credentials are not configured on the backend.');
  }

  try {
    return JSON.parse(raw);
  } catch {
    throw new ApiError(503, 'Google Play verification is unavailable: service-account credentials are invalid JSON.');
  }
};

const getAuth = () => {
  if (!auth) {
    auth = new GoogleAuth({
      credentials: parseServiceAccount(),
      scopes: [ANDROID_PUBLISHER_SCOPE],
    });
  }

  return auth;
};

const getAccessToken = async () => {
  try {
    const client = await getAuth().getClient();
    const response = await client.getAccessToken();
    const token = typeof response === 'string' ? response : response?.token;
    if (!token) {
      throw new ApiError(503, 'Google Play verification is unavailable: service-account authentication returned no token.');
    }
    return token;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    // A credential failure may include provider details in the underlying error.
    // Do not surface them to app users or persist purchase data in logs.
    throw new ApiError(503, 'Google Play verification is unavailable: the backend service account could not authenticate.');
  }
};

const googleRequest = async <T>(
  path: string,
  init: RequestInit = {},
): Promise<T> => {
  const token = await getAccessToken();
  let response: Response;
  try {
    response = await fetch(`${API_ROOT}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(init.headers ?? {}),
      },
    });
  } catch {
    throw new ApiError(503, 'Google Play verification is temporarily unavailable. Retry Restore Purchase later.');
  }

  if (!response.ok) {
    const failure = classifyGooglePlayHttpError(response.status);
    throw new ApiError(failure.statusCode, failure.message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
};

const packagePath = () =>
  `/applications/${encodeURIComponent(env.GOOGLE_PLAY_PACKAGE_NAME)}`;

export const googlePlayApi = {
  getSubscription(purchaseToken: string) {
    return googleRequest<any>(
      `${packagePath()}/purchases/subscriptionsv2/tokens/${encodeURIComponent(
        purchaseToken,
      )}`,
    );
  },

  acknowledgeSubscription(productId: string, purchaseToken: string) {
    return googleRequest<void>(
      `${packagePath()}/purchases/subscriptions/${encodeURIComponent(
        productId,
      )}/tokens/${encodeURIComponent(purchaseToken)}:acknowledge`,
      {
        method: 'POST',
        body: JSON.stringify({}),
      },
    );
  },

  getOneTimeProduct(purchaseToken: string) {
    return googleRequest<any>(
      `${packagePath()}/purchases/productsv2/tokens/${encodeURIComponent(
        purchaseToken,
      )}`,
    );
  },

  acknowledgeOneTimeProduct(productId: string, purchaseToken: string) {
    return googleRequest<void>(
      `${packagePath()}/purchases/products/${encodeURIComponent(
        productId,
      )}/tokens/${encodeURIComponent(purchaseToken)}:acknowledge`,
      {
        method: 'POST',
        body: JSON.stringify({}),
      },
    );
  },
};
