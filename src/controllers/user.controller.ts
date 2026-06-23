import { Request, Response } from 'express';
import { userService } from '../services/user.service';
import { sendSuccess } from '../utils/ApiResponse';

export const userController = {
  async me(req: Request, res: Response) {
    // `req.user` is guaranteed by the authenticate middleware.
    const profile = await userService.getProfile(req.user!.id);
    sendSuccess(res, profile);
  },


};
