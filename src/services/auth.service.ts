import type { User } from '@prisma/client';

import prisma from '../config/prisma';

import { ApiError } from '../utils/ApiError';

import {
  comparePassword,
} from '../utils/password';

import { hashPassword } from '../utils/password';

import { signToken } from '../utils/jwt';


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



    const user =
      await prisma.user.findUnique({

        where: {

          email: input.email

        },

        include: {

          role: true

        }

      });



    if (!user) {

      throw ApiError.unauthorized(
        'Invalid email or password'
      );

    }




    const valid =
      await comparePassword(

        input.password,

        user.passwordHash

      );



    if (!valid) {

      throw ApiError.unauthorized(
        'Invalid email or password'
      );

    }




    const token =
      signToken({

        sub: user.id,

        email: user.email

      });



    /**
     * save login history
     */
    await prisma.userSession.create({

      data: {

        userId: user.id,

        token,

        ipAddress: ip,

        userAgent

      }

    });




    return {

      user: sanitize(user),

      token

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


  async register(
    input: {
      email: string;
      username: string;
      password: string;
    },

    ip?: string,

    userAgent?: string
  ) {


    const existing =
      await prisma.user.findUnique({

        where: {
          email: input.email
        }

      });



    if (existing) {

      throw ApiError.conflict(
        "An account with this email already exists"
      );

    }





    /**
     * Get default USER role
     */
    const userRole =
      await prisma.role.findUnique({

        where: {
          name: "USER"
        }

      });




    if (!userRole) {

      throw ApiError.internal(
        "Default USER role missing"
      );

    }





    /**
     * Create User
     */
    const user =
      await prisma.user.create({

        data: {


          email: input.email,


          username: input.username,


          passwordHash:
            await hashPassword(
              input.password
            ),



          /**
           * defaults
           */
          roleId: userRole.id,


          bio:
            "Hey there 👋 I am using FlexiWalls",



          avatarUrl:
            "https://api.dicebear.com/9.x/avataaars/svg?seed=" +
            encodeURIComponent(
              input.username
            ),



          isPremium: false,


          dailyDownloadCount: 0


        },


        include: {

          role: true

        }


      });





    /**
     * Generate JWT
     */
    const token =
      signToken({

        sub: user.id,

        email: user.email

      });






    /**
     * Save Login Session
     */
    await prisma.userSession.create({

      data: {


        userId: user.id,


        token,


        ipAddress: ip,


        userAgent


      }

    });






    return {


      token,


      user: {


        id: user.id,


        email: user.email,


        username: user.username,


        avatarUrl: user.avatarUrl,


        bio: user.bio,


        isPremium: user.isPremium,


        premiumUntil: user.premiumUntil,


        dailyDownloadCount:
          user.dailyDownloadCount,


        role: user.role,


        createdAt: user.createdAt


      }


    };


  }


};