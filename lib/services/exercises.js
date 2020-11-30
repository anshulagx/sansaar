const Schmervice = require('schmervice');
const _ = require('lodash');

module.exports = class ExercisesService extends Schmervice.Service {
  async getExercisesByCourseId(courseId, authUser) {
    const { Exercises } = this.server.models();
    if (authUser) {
      const exercises = await Exercises.query()
        .where('course_id', courseId)
        .modifiers({
          whereUserAuth(builder) {
            builder.where('user_id', authUser.id);
          },
        });
      const newExercises = exercises.filter((x) => (x.childExercises = []));
      return this.exercisesConvert(newExercises);
    }
    const exercises = await Exercises.findByCourseId(courseId);
    const newExercises = exercises.filter((x) => (x.childExercises = []));
    return this.exercisesConvert(newExercises);
  }

  async exercisesConvert(exercises) {
    this.convertedExercises = [];
    let childExercisesData = [];
    _.map(exercises, (exercise) => {
      if (exercise.parent_exercise_id) {
        delete exercise.content;
        childExercisesData.push(exercise);
      } else {
        delete exercise.content;
        if (childExercisesData.length) {
          _.map(childExercisesData, (child, index) => {
            if (index > 0) {
              childExercisesData[0].childExercises.push(child);
            }
          });
          this.convertedExercises.push(childExercisesData[0]);
          childExercisesData = [];
        }
        this.convertedExercises.push(exercise);
      }
    });
    return this.convertedExercises;
  }

  async getExerciseBySlug(slug, authUser, txn = null) {
    const { Exercises } = this.server.models();
    let exercise;
    if (authUser) {
      exercise = await Exercises.query(txn)
        .where('slug', slug)
        .modifiers({
          whereUserAuth(builder) {
            builder.where('user_id', authUser.id);
          },
        });
      return exercise;
    }
    exercise = await Exercises.query(txn).where('slug', slug);
    return exercise;
  }

  async upsertExercises(details, txn) {
    const { exercise, childExercise } = details;
    const { Exercises } = this.server.models();
    if (childExercise) {
      if (childExercise.length) {
        return this.upsertChildExercises(childExercise);
      }
    }
    if (exercise) {
      const ifExerciseExist = await Exercises.query(txn).where('slug', exercise.slug);
      if (ifExerciseExist.length) {
        return Exercises.query(txn)
          .update(exercise)
          .where('course_id', exercise.course_id)
          .andWhere('slug', exercise.slug);
      }
      return Exercises.query(txn).insert(exercise);
    }
    return true;
  }

  async upsertChildExercises(childExercise, txn) {
    const { Exercises } = this.server.models();
    const promises = [];
    const promises2 = [];
    let parent_exercise_id;

    const ifChildExerciseExist = await Exercises.query(txn).where('slug', childExercise[0].slug);

    if (!ifChildExerciseExist.length) {
      // Adding first child exercise for getting parent_exercise_id to others child
      const addFirstChildExercise = await Exercises.query(txn).insert(childExercise[0]);
      parent_exercise_id = addFirstChildExercise.id;
    } else {
      // if already exist then set parent_exercise_id as it is for others.
      parent_exercise_id = ifChildExerciseExist[0].id;
    }
    // assing parent_exercise_id to all child exercise.
    const updatedChildExercise = childExercise.filter(
      (x) => (x.parent_exercise_id = parent_exercise_id)
    );
    // get to know which child exercise is already is in database.
    _.map(updatedChildExercise, (exercise) => {
      promises.push(
        Exercises.query().where('course_id', exercise.course_id).andWhere('slug', exercise.slug)
      );
    });

    const updateOrAdd = await Promise.all(promises);

    _.map(updateOrAdd, (ifChildExrExist, index) => {
      if (ifChildExrExist.length) {
        // if child exercise is already there then update it otherwise insert them.
        promises2.push(
          Exercises.query(txn)
            .update(updatedChildExercise[index])
            .where('course_id', updatedChildExercise[index].course_id)
            .andWhere('slug', updatedChildExercise[index].slug)
        );
      } else {
        promises2.push(Exercises.query(txn).insert(updatedChildExercise[index]));
      }
    });
    await Promise.all(promises2);
    return true;
  }
};
