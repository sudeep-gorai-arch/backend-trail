import { Request, Response } from 'express';

import { authService } from '../services/auth.service';
import { sendSuccess } from '../utils/ApiResponse';


export const authController = {

  async login(req: Request, res: Response) {


    const result = await authService.login(

      req.body,

      req.ip,

      req.headers['user-agent']

    );


    sendSuccess(res, result, {
      message: 'Logged in successfully'
    });


  },



  async logout(req: Request, res: Response) {


    const token =
      req.headers.authorization
        ?.replace('Bearer ', '');



    if (!token) {

      throw new Error(
        'Token missing'
      );

    }



    const result =
      await authService.logout(token);



    sendSuccess(res, result, {
      message: 'Logged out successfully'
    });


  },

    async register(
    req: Request,
    res: Response
  ) {


    const result =
      await authService.register(

        req.body,

        req.ip,

        req.headers["user-agent"]

      );



    sendSuccess(res, result, {

      status: 201,

      message: "Account created successfully"

    });


  }


};