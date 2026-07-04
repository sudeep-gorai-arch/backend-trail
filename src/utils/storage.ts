import fs from "fs";
import path from "path";

const STORAGE_ROOT = path.join(process.cwd(), "storage");

export const Storage = {
    root: STORAGE_ROOT,

    originals: path.join(STORAGE_ROOT, "originals"),

    display: path.join(STORAGE_ROOT, "display"),

    thumbnails: path.join(STORAGE_ROOT, "thumbnails"),

    temp: path.join(STORAGE_ROOT, "temp"),
};

/**
 * Ensure directory exists
 */
export const ensureDirectory = (dir: string) => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, {
            recursive: true,
        });
    }
};

/**
 * Create storage structure on server startup.
 */
export const initializeStorage = () => {
    ensureDirectory(Storage.root);
    ensureDirectory(Storage.originals);
    ensureDirectory(Storage.display);
    ensureDirectory(Storage.thumbnails);
    ensureDirectory(Storage.temp);
};

/**
 * Creates category folders automatically.
 *
 * storage/
 *    originals/
 *       Nature/
 *    display/
 *       Nature/
 *    thumbnails/
 *       Nature/
 */
export const createCategoryFolders = (
    folderName: string,
) => {
    const originalDir = path.join(
        Storage.originals,
        folderName,
    );

    const displayDir = path.join(
        Storage.display,
        folderName,
    );

    const thumbnailDir = path.join(
        Storage.thumbnails,
        folderName,
    );

    ensureDirectory(originalDir);
    ensureDirectory(displayDir);
    ensureDirectory(thumbnailDir);

    return {
        originalDir,
        displayDir,
        thumbnailDir,
    };
};

/**
 * Delete folder recursively
 */
export const removeFolder = (
    folderPath: string,
) => {
    if (fs.existsSync(folderPath)) {
        fs.rmSync(folderPath, {
            recursive: true,
            force: true,
        });
    }
};

/**
 * Delete single file
 */
export const removeFile = (
    filePath: string,
) => {
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }
};

/**
 * Move uploaded file
 */
export const moveFile = (
    from: string,
    to: string,
) => {
    ensureDirectory(path.dirname(to));

    fs.renameSync(from, to);
};

/**
 * Copy file
 */
export const copyFile = (
    from: string,
    to: string,
) => {
    ensureDirectory(path.dirname(to));

    fs.copyFileSync(from, to);
};

/**
 * Check file exists
 */
export const fileExists = (
    filePath: string,
) => {
    return fs.existsSync(filePath);
};

/**
 * Get file size in bytes
 */
export const getFileSize = (
    filePath: string,
) => {
    if (!fs.existsSync(filePath)) {
        return 0;
    }

    return fs.statSync(filePath).size;
};

/**
 * Returns filesystem paths + database relative paths.
 */
/**
 * Returns filesystem paths + database relative paths.
 */
export const getWallpaperPaths = (
    categoryFolder: string,
    originalFileName: string,
    processedFileName: string,
) => ({
    // ==========================
    // Physical paths
    // ==========================

    original: path.join(
        Storage.originals,
        categoryFolder,
        originalFileName,
    ),

    display: path.join(
        Storage.display,
        categoryFolder,
        processedFileName,
    ),

    thumbnail: path.join(
        Storage.thumbnails,
        categoryFolder,
        processedFileName,
    ),

    // ==========================
    // Database paths
    // ==========================

    originalDb: path.posix.join(
        "originals",
        categoryFolder,
        originalFileName,
    ),

    displayDb: path.posix.join(
        "display",
        categoryFolder,
        processedFileName,
    ),

    thumbnailDb: path.posix.join(
        "thumbnails",
        categoryFolder,
        processedFileName,
    ),
});