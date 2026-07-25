import { GoogleAuth } from 'google-auth-library';

import { env } from './env';
import { ApiError } from '../utils/ApiError';

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
    throw ApiError.internal(
      'Google Play service-account credentials are not configured.',
    );
  }

  try {
    return JSON.parse(raw);
  } catch {
    throw ApiError.internal(
      'Google Play service-account credentials are invalid JSON.',
    );
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
  const client = await getAuth().getClient();
  const response = await client.getAccessToken();
  const token = typeof response === 'string' ? response : response?.token;

  if (!token) {
    throw ApiError.internal('Unable to obtain a Google Play API token.');
  }

  return token;
};

const googleRequest = async <T>(
  path: string,
  init: RequestInit = {},
): Promise<T> => {
  const token = await getAccessToken();
  const response = await fetch(`${API_ROOT}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    const details = await response.text();
    throw ApiError.badRequest(
      `Google Play verification failed (${response.status}).`,
      details,
    );
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
