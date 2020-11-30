const { Model } = require('objection');
const Joi = require('@hapi/joi');
const ModelBase = require('./helpers/ModelBase');

module.exports = class Classes extends ModelBase {
  static get tableName() {
    return 'main.classes';
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.number().integer().greater(0),
      title: Joi.string(),
      description: Joi.string(),
      facilitator_id: Joi.number().integer().greater(0),
      facilitator_name: Joi.string().max(80),
      facilitator_email: Joi.string()
        .max(120)
        .pattern(
          // eslint-disable-next-line
          /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
        ),
      start_time: Joi.date(),
      end_time: Joi.date(),
      exercise_id: Joi.number(),
      course_id: Joi.number(),
      category_id: Joi.number().integer(),
      video_id: Joi.string(),
      lang: Joi.string().valid('hi', 'en', 'te', 'ta').lowercase(),
      type: Joi.string().valid('workshop', 'doubt_class'),
      meet_link: Joi.string()
        .length(12)
        .pattern(/\w{3}(-)\w{4}(-)\w{3}/),
      calendar_event_id: Joi.string(),
    });
  }

  static get relationMappings() {
    /* eslint-disable global-require */
    const Courses = require('./courses');
    const User = require('./user');
    const ClassRegistrations = require('./classRegistrations');
    /* eslint-enable global-require */

    return {
      courses: {
        relation: Model.HasOneRelation,
        modelClass: Courses,
        join: {
          from: 'main.classes.exercise_id',
          to: 'main.courses.id',
        },
      },
      facilitator: {
        relation: Model.HasOneRelation,
        modelClass: User,
        filter: (query) => query.select('name'),
        join: {
          from: 'main.classes.facilitator_id',
          to: 'main.users.id',
        },
      },
      users: {
        relation: Model.ManyToManyRelation,
        modelClass: User,
        join: {
          from: 'main.classes.id',
          through: {
            modelClass: ClassRegistrations,
            from: 'main.class_registrations.class_id',
            to: 'main.class_registrations.user_id',
          },
          to: 'main.users.id',
        },
      },
    };
  }
};
