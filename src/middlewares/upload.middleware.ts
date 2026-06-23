import multer from "multer";
import path from "path";


const storage = multer.diskStorage({

    destination: (
        _req,
        _file,
        cb
    ) => {

        cb(
            null,
            "uploads/"
        );

    },


    filename: (
        _req,
        file,
        cb
    ) => {

        const uniqueName =
            Date.now()
            + "-"
            + Math.round(Math.random() * 1e9)
            + path.extname(file.originalname);


        cb(
            null,
            uniqueName
        );

    }

});



export const upload =
    multer({

        storage,

        limits: {
            fileSize:
                10 * 1024 * 1024
        },

        fileFilter: (
            _req,
            file,
            cb
        ) => {


            if (
                file.mimetype.startsWith(
                    "image/"
                )
            ) {

                cb(null, true);

            }
            else {

                cb(
                    new Error(
                        "Only images allowed"
                    )
                );

            }


        }

    });