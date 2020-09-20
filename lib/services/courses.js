const Schmervice = require('schmervice');
const _ = require('lodash');
const Boom = require('@hapi/boom');

module.exports = class CoursesService extends Schmervice.Service {
  async getAllCourses(authUser, txn = null) {
    const { Courses, CourseEnrollment } = this.server.models();
    const availableCourses = await Courses.query(txn).orderBy('sequence_num', 'asc');
    if (authUser) {
      const enrolCourses = await CourseEnrollment.query(txn).where('student_id', authUser.id);
      return {
        availableCourses,
        enrolCourses,
      };
    }
    return {
      availableCourses,
    };
  }

  async courses(courseId) {
    const { Courses } = this.server.models();
    const courses = await Courses.query().findById(courseId).orderBy('sequence_num', 'asc');
    return courses;
  }

  async enrollInCourse(courseId, authUser, txn) {
    const { CourseEnrollment } = this.server.models();
    const isEnroll = await CourseEnrollment.query(txn).where({
      student_id: authUser.id,
      course_id: courseId,
    });
    if (isEnroll.length) {
      return { alreadyEnrolled: true };
    }
    await CourseEnrollment.query(txn).insert({
      student_id: authUser.id,
      course_id: courseId,
      enrolled_at: new Date(),
    });
    return { success: true };
  }

  async deleteCourseById(courseId) {
    const { Courses, CourseEnrollment, Exercises } = this.server.models();
    // delete all course enrolment.
    await CourseEnrollment.query().delete().where('course_id', courseId);
    // delete all exercises with respective course.
    await Exercises.query().delete().where('course_id', courseId);
    // finally delete course.
    if (await Courses.query().deleteById(courseId)) return { success: true };
    throw Boom.badRequest(`Course with id ${courseId} doesn't exist`);
  }

  async updateCourse(exercises, txn) {
    const { Exercises } = this.server.models();
    const promises = [];
    _.map(exercises, (exercise) => {
      promises.push(Exercises.query(txn).update(exercise).where('name', exercise.name));
    });
    await Promise.all(promises);
    return true;
  }

  async findByCourseName(name) {
    const { Courses } = this.server.models();
    const nameLowerCase = name.toLowerCase();
    const course = await Courses.query().whereRaw(`LOWER(name) LIKE ?`, [`%${nameLowerCase}%`]);
    return course;
  }

  async createNewCourse(details, txn) {
    const { Courses } = this.server.models();
    const createCourse = await Courses.query(txn).insert(details);
    return createCourse;
  }

  async createCategory(category) {
    const { Category } = this.server.models();
    const courseCategory = { ...category, created_at: new Date() };
    return Category.query().insert(courseCategory);
  }
};
