export const retry = async <T>(
    fn: () => Promise<T>,
    retries = 3,
): Promise<T> => {
    let lastError: any;

    for (let i = 0; i < retries; i++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
        }
    }

    throw lastError;
};