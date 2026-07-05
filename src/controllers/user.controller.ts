import { Request, Response } from "express";

import { userService } from "../services/user.service";

import { response } from "../utils/ApiResponse";

export const userController = {
  async me(req: Request, res: Response) {
    const user = await userService.me(req.user!.id);

    response.success(res, user);
  },

  async updateProfile(req: Request, res: Response) {
    const user = await userService.updateProfile(
      req.user!.id,
      req.body
    );

    response.success(res, user, {
      message: "Profile updated successfully.",
    });
  },

  async deleteAccount(req: Request, res: Response) {
    const result = await userService.deleteAccount(req.user!.id);

    response.success(res, result, {
      message: "Account and data deleted successfully.",
    });
  },
};