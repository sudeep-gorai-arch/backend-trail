import type { User } from '@prisma/client';

import prisma from '../config/prisma';

import { ApiError } from '../utils/ApiError';

import {
  comparePassword,
} from '../utils/password';


import { signToken } from '../utils/jwt';

import { OAuth2Client } from "google-auth-library";


const googleClient =
  new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID
  );

/**
 * Remove sensitive fields
 */
const sanitize = (user: User) => {

  const safe = { ...user } as Partial<User>;

  delete safe.passwordHash;

  return safe;

};



export const authService = {


  async login(
    input: {
      email: string;
      password: string;
    },
    ip?: string,
    userAgent?: string
  ) {
    const user = await prisma.user.findUnique({
      where: {
        email: input.email,
      },
      include: {
        role: true,
      },
    });

    if (!user) {
      throw ApiError.unauthorized(
        "Invalid email or password."
      );
    }

    if (user.authProvider !== "LOCAL") {
      throw ApiError.unauthorized(
        "Please sign in with Google."
      );
    }

    if (!user.passwordHash) {
      throw ApiError.unauthorized(
        "Password not set."
      );
    }

    const validPassword = await comparePassword(
      input.password,
      user.passwordHash
    );

    if (!validPassword) {
      throw ApiError.unauthorized(
        "Invalid email or password."
      );
    }

    // Close previous active sessions
    await prisma.userSession.updateMany({
      where: {
        userId: user.id,
        isActive: true,
      },
      data: {
        isActive: false,
        logoutAt: new Date(),
      },
    });

    const token = signToken({
      sub: user.id,
      email: user.email,
      role: user.role?.name,
    });

    await prisma.userSession.create({
      data: {
        userId: user.id,
        token,
        ipAddress: ip,
        userAgent,
        isActive: true,
      },
    });

    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        lastSeen: new Date(),
      },
    });

    return {
      token,
      user: sanitize(user),
    };
  },


  async logout(token: string) {

    const session =
      await prisma.userSession.findUnique({

        where: {

          token

        }

      });




    if (!session) {

      throw ApiError.unauthorized(
        'Invalid session'
      );

    }




    await prisma.userSession.update({

      where: {

        token

      },


      data: {

        isActive: false,

        logoutAt: new Date()

      }

    });



    return {

      success: true

    };


  },


  async googleLogin(
    idToken: string,
    ip?: string,
    userAgent?: string
  ) {
    if (!idToken) {
      throw ApiError.badRequest(
        "Google token is required."
      );
    }

    const ticket =
      await googleClient.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

    const payload = ticket.getPayload();

    if (!payload) {
      throw ApiError.unauthorized(
        "Invalid Google account."
      );
    }

    if (!payload.email) {
      throw ApiError.unauthorized(
        "Google account has no email."
      );
    }

    if (!payload.email_verified) {
      throw ApiError.unauthorized(
        "Google email is not verified."
      );
    }

    const googleId = payload.sub;
    const email = payload.email;

    const username =
      payload.name ??
      email.split("@")[0];

    const avatar = payload.picture;

    let user =
      await prisma.user.findFirst({
        where: {
          OR: [
            {
              googleId,
            },
            {
              email,
            },
          ],
        },

        include: {
          role: true,
        },
      });

    // ------------------------------------
    // Create New User
    // ------------------------------------

    if (!user) {
      const role =
        await prisma.role.findUnique({
          where: {
            name: "USER",
          },
        });

      if (!role) {
        throw ApiError.internal(
          "Default USER role not found."
        );
      }

      user =
        await prisma.user.create({
          data: {
            email,

            username,

            googleId,

            authProvider: "GOOGLE",

            roleId: role.id,

            avatarUrl:
              avatar ??
              "https://api.dicebear.com/9.x/initials/svg?seed=" +
              encodeURIComponent(username),

            bio:
              "Hey there 👋 I am using FlexiWalls",

            isPremium: false,

            dailyDownloadCount: 0,

            lastSeen: new Date(),
          },

          include: {
            role: true,
          },
        });
    }

    // ------------------------------------
    // Link Existing LOCAL Account
    // ------------------------------------

    else if (!user.googleId) {
      user =
        await prisma.user.update({
          where: {
            id: user.id,
          },

          data: {
            googleId,

            authProvider: "GOOGLE",

            avatarUrl:
              user.avatarUrl ?? avatar,

            lastSeen: new Date(),
          },

          include: {
            role: true,
          },
        });
    }

    // ------------------------------------
    // Existing Google User
    // ------------------------------------

    else {
      user =
        await prisma.user.update({
          where: {
            id: user.id,
          },

          data: {
            lastSeen: new Date(),
          },

          include: {
            role: true,
          },
        });
    }

    // Close previous sessions

    await prisma.userSession.updateMany({
      where: {
        userId: user.id,
        isActive: true,
      },

      data: {
        isActive: false,

        logoutAt: new Date(),
      },
    });

    const token = signToken({
      sub: user.id,

      email: user.email,

      role: user.role?.name,
    });

    await prisma.userSession.create({
      data: {
        userId: user.id,

        token,

        ipAddress: ip,

        userAgent,

        isActive: true,
      },
    });

    return {
      token,

      user: sanitize(user),
    };
  }


};