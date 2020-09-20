const Joi = require('@hapi/joi');
const ModelBase = require('./helpers/ModelBase');

module.exports = class Exercises extends ModelBase {
  static get tableName() {
    return 'main.exercises';
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.number().integer().greater(0),
      parent_exercise_id: Joi.number().integer().greater(0),
      course_id: Joi.number().integer().greater(0).required(),
      name: Joi.string().max(100).required(),
      slug: Joi.string().max(300).required(),
      sequence_num: Joi.number().integer(),
      review_type: Joi.string(),
      content: Joi.string(),
      submission_type: Joi.string(),
      github_link: Joi.string(),
      solution: Joi.string(),
    });
  }

  static async findByCourseId(courseId) {
    const exercise = await this.query().where('course_id', courseId).orderBy('sequence_num', 'asc');
    return exercise;
  }
};
