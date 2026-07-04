export const bytesToKB = (bytes: number) =>
    Number((bytes / 1024).toFixed(2));

export const bytesToMB = (bytes: number) =>
    Number((bytes / 1024 / 1024).toFixed(2));

export const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;

    if (bytes < 1024 * 1024)
        return `${(bytes / 1024).toFixed(2)} KB`;

    if (bytes < 1024 * 1024 * 1024)
        return `${(bytes / 1024 / 1024).toFixed(2)} MB`;

    return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
};