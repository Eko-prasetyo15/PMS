var express = require('express');
var router = express.Router();
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const saltRounds = 10;

router.use(bodyParser.urlencoded({
  extended: false
}));
router.use(bodyParser.json());


module.exports = (db) => {
  /* GET home page. */
  router.get('/', (req, res, next) => {
    res.render('login');
  });
  // router.post('/register', function (req, res, next) {
  //   const { email, password, firstname, lastname } = req.body;
  //   bcrypt.hash(password, saltRounds, function (err, hash) {
  //     if (err) return res.send(err)
  //     db.query('INSERT INTO users (email, password, firstname, lastname) VALUES ($1, $2, $3, $4)', [email, hash, firstname, lastname], (err, data) => {
  //       if (err) return res.send(err)
  //       res.json(data.rows);
  //     });
  //   });
  // });
  router.post('/login', (req, res) => {
    const { email, password } = req.body
    db.query(`SELECT * FROM users WHERE email = $1`, [email], (err, data) => {
      if (err) return res.send(err)
      if (data.rows.length == 0) {
        return res.redirect('/project');
      }

      if (data.rows[0].email != email && data.rows[0].password != password) {
        return res.redirect('/');
      };
      req.session.user = data.rows[0];
      res.redirect('/project');
    });
  })

  router.get('/logout', function (req, res, next) {
    if (req.session) {
      // delete session object
      req.session.destroy(function (err) {
        if (err) {
          return next(err);
        } else {
          return res.redirect('/');
        }
      });
    }
  });


  return router;
}