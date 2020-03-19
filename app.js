const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const session = require('express-session')
const flash = require('connect-flash');

//Model setup
const { Pool } = require("pg");
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'pmsdb',
  password: '040774',
  port: 5432,
})
console.log("Successful connection to the database");

var loginRouter = require('./routes/login')(pool);
var usersRouter = require('./routes/users')(pool);
var profileRouter = require('./routes/profile')(pool);
var projectRouter = require('./routes/project')(pool);



var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public/login')));

app.use('/', loginRouter);
app.use('/users', usersRouter);
app.use('/profile', profileRouter);
app.use('/project', projectRouter);




// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
