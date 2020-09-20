const Schmervice = require('schmervice');
const Boom = require('@hapi/boom');
const _ = require('lodash');

module.exports = class ClassesService extends Schmervice.Service {
  async getUpcomingClasses(filters, userId) {
    const { Classes, ClassRegistrations } = this.server.models();
    const { startDate, endDate, lang, classType } = filters;
    const classes = await Classes.query()
      .skipUndefined()
      .where('start_time', '>=', startDate)
      .andWhere('end_time', '<=', endDate)
      .andWhere('lang', lang)
      .andWhere('class_type', classType)
      .limit(100)
      .orderBy('start_time');
    if (userId !== undefined) {
      let enrolledClassIdList = [];
      const eClasses = await ClassRegistrations.query().where('user_id', userId);
      eClasses.map((enrClass) => {
        return enrolledClassIdList.push(enrClass.class_id);
      });
      const onlyEnrolledClasses = _.filter(classes, (o) => {
        return enrolledClassIdList.indexOf(o.id) < 0;
      });
      return onlyEnrolledClasses;
    }
    return classes;
  }

  async createClass(newClass) {
    const { Classes } = this.server.models();
    return Classes.query().insert(newClass);
  }

  async deleteClass(classId) {
    const { Classes, ClassRegistrations } = this.server.models();
    await ClassRegistrations.query().delete().where('class_id', classId);
    const deleted = await Classes.query().delete().where('id', classId);
    if (deleted > 0) {
      return { success: true };
    }
    throw Boom.badRequest("Class doesn't exist");
  }

  async getClassById(classId) {
    const { Classes } = this.server.models();
    const classes = await Classes.query().findById(classId);
    if (classes) return classes;
    throw Boom.badRequest("Class doesn't exist");
  }

  async updateClass(id, classUpdates) {
    const { Classes } = this.server.models();
    return Classes.query().update(classUpdates).where('id', id);
  }

  async recommendedClasses() {
    const { Classes } = this.server.models();
    return Classes.query().orderByRaw(`random()`).limit(4);
  }
};
