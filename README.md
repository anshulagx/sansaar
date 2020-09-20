# Sansaar

Everything backend about NavGurukul :)

## Projet set-up
- Clone the repo `git clone https://github.com/navgurukul/sansaar.git`
- Install dependencies `npm install` and then chnage directory `cd sansaar`
- `npm install -g knex`
- Copy `server/sample.env` file to `server/.env` file and change the appropriate field.
- Run `knex migrate:latest` for updating migration file.
- If any error is throwing while running above script then login to the postgres server and remove all the rows of the the knex_migrations table using `TRUNCATE TABLE knex_migrations` and run `knex migrate:latest` again.

## To Dos
- [ ] How to show scope on Swagger?
- [ ] Add service generator in .hc.js
- [ ] Swagger API should work on prod

## course add and update

running it with `--addUpdateSingleCourse` will add or update single course returned by the server.

```bash
node lib/courseSeeder/index.js --addUpdateSingleCourse {course_name}
```

running below script will add or update all course returned by the server.

```bash
node lib/courseSeeder/index.js 
```

## Curriculum
1. ```git clone https://github.com/navgurukul/newton curriculum```
