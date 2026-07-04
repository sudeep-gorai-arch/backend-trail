import fs from "fs";
import path from "path";

const UPLOAD_ROOT = path.join(process.cwd(), "uploads");

// ---------------------------------------------------
// Ensure Directory Exists
// ---------------------------------------------------

export const ensureDirectoryExists = (dir: string): void => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, {
            recursive: true,
        });
    }
};

// ---------------------------------------------------
// Create Category Folder Structure
// uploads/
//    Nature/
//        original/
//        display/
//        thumbnail/
// ---------------------------------------------------

export const createCategoryFolders = (
    folderName: string
) => {
    const safeFolder = sanitizeFolderName(folderName);

    const root = path.join(
        UPLOAD_ROOT,
        safeFolder
    );

    const original = path.join(
        root,
        "original"
    );

    const display = path.join(
        root,
        "display"
    );

    const thumbnail = path.join(
        root,
        "thumbnail"
    );

    ensureDirectoryExists(root);
    ensureDirectoryExists(original);
    ensureDirectoryExists(display);
    ensureDirectoryExists(thumbnail);

    return {
        root,
        original,
        display,
        thumbnail,
    };
};

// ---------------------------------------------------
// Remove File
// ---------------------------------------------------

export const deleteFile = (
    filePath: string
) => {
    if (
        fs.existsSync(filePath)
    ) {
        fs.unlinkSync(filePath);
    }
};

// ---------------------------------------------------
// Remove Folder
// ---------------------------------------------------

export const deleteDirectory = (
    dir: string
) => {
    if (
        fs.existsSync(dir)
    ) {
        fs.rmSync(dir, {
            recursive: true,
            force: true,
        });
    }
};

// ---------------------------------------------------
// File Exists
// ---------------------------------------------------

export const fileExists = (
    filePath: string
): boolean => {
    return fs.existsSync(filePath);
};

// ---------------------------------------------------
// Move Uploaded File
// ---------------------------------------------------

export const moveFile = (
    from: string,
    to: string
) => {
    ensureDirectoryExists(
        path.dirname(to)
    );

    fs.renameSync(from, to);
};

// ---------------------------------------------------
// Copy File
// ---------------------------------------------------

export const copyFile = (
    from: string,
    to: string
) => {
    ensureDirectoryExists(
        path.dirname(to)
    );

    fs.copyFileSync(from, to);
};

// ---------------------------------------------------
// Generate Unique Filename
// ---------------------------------------------------

export const generateFileName = (
    extension: string
) => {
    return (
        Date.now() +
        "-" +
        Math.random()
            .toString(36)
            .substring(2, 10) +
        extension
    );
};

// ---------------------------------------------------
// Sanitize Folder Name
// Nature Wallpapers
// nature-wallpapers
// ---------------------------------------------------

export const sanitizeFolderName = (
    value: string
) => {
    return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-/, "")
        .replace(/-$/, "");
};

// ---------------------------------------------------
// Relative URL
// uploads/nature/display/abc.webp
// ->
// /uploads/nature/display/abc.webp
// ---------------------------------------------------

export const getRelativeUrl = (
    absolutePath: string
) => {
    const relative = path.relative(
        process.cwd(),
        absolutePath
    );

    return "/" +
        relative.replace(
            /\\/g,
            "/"
        );
};

// ---------------------------------------------------
// Build Variant Path
// ---------------------------------------------------

export const getVariantPath = (
    categoryFolder: string,
    variant:
        | "original"
        | "display"
        | "thumbnail",
    filename: string
) => {
    return path.join(
        UPLOAD_ROOT,
        sanitizeFolderName(
            categoryFolder
        ),
        variant,
        filename
    );
};

// ---------------------------------------------------
// Root Upload Folder
// ---------------------------------------------------

export const getUploadRoot =
    () => UPLOAD_ROOT;

// ---------------------------------------------------
// Empty Folder
// ---------------------------------------------------

export const clearDirectory = (
    dir: string
) => {
    if (
        !fs.existsSync(dir)
    )
        return;

    const files =
        fs.readdirSync(dir);

    for (const file of files) {
        const current = path.join(
            dir,
            file
        );

        if (
            fs.lstatSync(current).isDirectory()
        ) {
            deleteDirectory(current);
        } else {
            fs.unlinkSync(current);
        }
    }
};

// ---------------------------------------------------
// Get File Size
// ---------------------------------------------------

export const getFileSize = (
    file: string
) => {
    return fs.statSync(file).size;
};

// ---------------------------------------------------
// Get Extension
// ---------------------------------------------------

export const getExtension = (
    filename: string
) => {
    return path.extname(filename);
};

// ---------------------------------------------------
// Get File Name Without Extension
// ---------------------------------------------------

export const getFileName = (
    filename: string
) => {
    return path.parse(filename).name;
};