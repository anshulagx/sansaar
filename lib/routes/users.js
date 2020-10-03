const Joi = require('@hapi/joi');
const Boom = require('@hapi/boom');
const _ = require('lodash');
const User = require('../models/user');
const UserRole = require('../models/userRole');
const { getEditableRoles } = require('./helpers');

module.exports = [
  {
    method: 'POST',
    path: '/users/create',
    options: {
      description: 'Create a user (Sign Up)',
      tags: ['api'],
      handler: async (request) => {
        // eslint-disable-next-line
        console.log(request.headers);
        // eslint-disable-next-line
        console.log(request.server.info);
        const { userService } = request.services();
        const user = await userService.createUser();
        const { room_id, ...userClone } = user;
        const token = await userService.createToken(userClone);
        return {
          room_id,
          user: userClone,
          token,
        };
      },
    },
  },
  {
    method: 'POST',
    path: '/users/auth/google',
    options: {
      description:
        'Generate JWT for sansaar, matrix chat_id and chat_password using google idToken.',
      tags: ['api'],
      validate: {
        payload: Joi.object({
          idToken: Joi.string().required(),
          mode: Joi.string().valid('web', 'android').default('web').required(),
          id: Joi.number().greater(0).optional(),
        }),
      },
      handler: async (request) => {
        const { userService, displayService } = request.services();
        const userObj = await userService.loginWithGoogle(request.payload);

        const token = await userService.createToken(userObj.user);
        if (userObj.roomId) {
          const userDetails = await displayService.userProfile(userObj.user);
          return {
            room_id: userObj.roomId.room_id,
            user: userDetails,
            token,
          };
        }
        return {
          user: await displayService.userProfile(userObj.user),
          token,
        };
      },
    },
  },
  {
    method: 'GET',
    path: '/users/{userId}',
    options: {
      description: 'Get a single user.',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
      },
      validate: {
        params: Joi.object({
          userId: User.field('id'),
        }),
      },
      handler: async (request) => {
        const { userService, displayService } = request.services();
        const user = await userService.findById(request.params.userId);

        return { user: await displayService.userProfile(user) };
      },
    },
  },
  {
    method: 'PUT',
    path: '/users/{userId}',
    options: {
      description: 'Edit a user (There is a different endpoint to edit the roles.)',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
      },
      validate: {
        params: Joi.object({
          userId: User.field('id'),
        }),
        payload: Joi.object({
          name: User.field('name'),
          profile_picture: User.field('profile_picture'),
          rolesList: Joi.array().items(UserRole.field('role')),
        }),
      },
      handler: async (request, h) => {
        const { userService, displayService } = request.services();
        const { userId } = request.params;

        const updateAndFetch = async (txn) => {
          await userService.update(userId, request.payload, txn);
          return userService.findById(userId, txn);
        };

        const user = await h.context.transaction(updateAndFetch);

        return { user: await displayService.userProfile(user) };
      },
    },
  },
  {
    method: 'POST',
    path: '/users/{userId}/roles',
    options: {
      description: 'Add a set of roles to the user.',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        scope: ['team', 'facha', 'dumbeldore', 'trainingAndPlacement'],
      },
      validate: {
        params: Joi.object({
          userId: User.field('id'),
        }),
        payload: Joi.object({
          rolesList: Joi.array().items(UserRole.field('role')),
        }),
      },
      handler: async (request, h) => {
        const { userService, displayService } = request.services();
        const { userId } = request.params;

        // check if the current roles of the user gives them right to make the required changes
        const editableRolesForUser = getEditableRoles(request.auth.credentials.scope);
        const nonEditableRoles = _.difference(request.payload.rolesList, editableRolesForUser);
        if (nonEditableRoles.length > 0) {
          throw Boom.forbidden(
            `Logged in user doesn't have the right to edit ${nonEditableRoles.join(',')} role(s).`
          );
        }
        const updateAndFetch = async (txn) => {
          await userService.addRoles(userId, request.payload.rolesList, txn);
          return userService.findById(userId, txn);
        };

        const user = await h.context.transaction(updateAndFetch);

        return { user: await displayService.userProfile(user) };
      },
    },
  },
  {
    method: 'DELETE',
    path: '/users/{userId}/roles',
    options: {
      description: 'Remove roles from a user.',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        scope: ['team', 'facha', 'dumbeldore', 'trainingAndPlacement'],
      },
      validate: {
        params: Joi.object({
          userId: User.field('id'),
        }),
        payload: Joi.object({
          rolesList: Joi.array().items(UserRole.field('role')),
        }),
      },
      handler: async (request, h) => {
        const { userService, displayService } = request.services();
        const { userId } = request.params;

        // check if the current roles of the user gives them right to make the required changes
        const editableRolesForUser = getEditableRoles(request.auth.credentials.scope);
        const nonEditableRoles = _.difference(request.payload.rolesList, editableRolesForUser);
        if (nonEditableRoles.length > 0) {
          throw Boom.forbidden(
            `Logged in user doesn't have the right to edit ${nonEditableRoles.join(',')} role(s).`
          );
        }

        const updateAndFetch = async (txn) => {
          await userService.removeRoles(userId, request.payload.rolesList, txn);
          return userService.findById(userId, txn);
        };

        const user = await h.context.transaction(updateAndFetch);

        return { user: await displayService.userProfile(user) };
      },
    },
  },
  {
    method: 'GET',
    path: '/users',
    options: {
      description: 'List of all users.',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
      },
      handler: async (request) => {
        const { userService, displayService } = request.services();

        const results = await userService.find();
        return { users: await displayService.userProfile(results) };
      },
    },
  },
  {
    method: 'GET',
    path: '/users/me',
    options: {
      description: 'Details of current user.',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
      },
      handler: async (request) => {
        const { userService, displayService } = request.services();

        const { artifacts: token } = request.auth;
        const user = await userService.findById(token.decoded.id);

        return { user: await displayService.userProfile(user) };
      },
    },
  },
  {
    method: 'GET',
    path: '/users/github/{email}',
    options: {
      description: 'Get github study pack access url for navgurukul students',
      tags: ['api'],
      validate: {
        params: Joi.object({
          email: User.field('email'),
        }),
      },
      handler: async (request) => {
        const { userService } = request.services();
        const { email } = request.params;
        const url = await userService.getGitHubAccessUrl(email);
        return { url };
      },
    },
  },
];
