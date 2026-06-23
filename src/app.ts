import express, {
  Application,
  Request,
  Response,
} from 'express';

import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';

import path from 'path';

import { env } from './config/env';

import routes from './routes';

import { notFound } from './middlewares/notFound.middleware';

import { errorHandler } from './middlewares/error.middleware';



const app: Application = express();




// ===============================
// Security & infra middleware
// ===============================

app.use(
  helmet({
    crossOriginResourcePolicy: false,
  })
);


app.use(
  cors({
    origin:
      env.CORS_ORIGIN === '*'
        ? true
        : env.CORS_ORIGIN
          .split(',')
          .map((o) => o.trim()),

    credentials: true,
  })
);



app.use(compression());


app.use(express.json());


app.use(
  express.urlencoded({
    extended: true,
  })
);





if (env.NODE_ENV !== 'test') {

  app.use(
    morgan(
      env.NODE_ENV === 'development'
        ? 'dev'
        : 'combined'
    )
  );

}







// ===============================
// STATIC FILES
// http://localhost:5000/uploads/file.jpg
// ===============================


app.use(

  "/uploads",

  express.static(

    path.join(
      process.cwd(),
      "uploads"
    )

  )

);









// ===============================
// Root info
// ===============================
app.get('/health', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'VividWalls API is healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.get(
  "/",

  (_req: Request, res: Response) => {


    res.json({

      success: true,

      message: "VividWalls API",

      health: "/api/health",

      uploads: "/uploads"

    });


  }

);









// ===============================
// API
// ===============================


app.use(
  "/api",
  routes
);










// ===============================
// 404 + ERROR HANDLER
// keep LAST
// ===============================


app.use(notFound);


app.use(errorHandler);




export default app;