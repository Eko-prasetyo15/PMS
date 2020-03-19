var express = require('express');
var router = express.Router();
const bcrypt = require('bcrypt');
const saltRounds = 10;

module.exports = (db) => {
  /* GET home page. */
  router.get('/', (req, res, next) => {
    res.render('login')
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
      return res.redirect('/project')
    });
});
router.get('/logout', function(req, res, next) {
  if (req.session) {
    // delete session object
    req.session.destroy(function(err) {
      if(err) {
        return next(err);
      } else {
        return res.redirect('/');
      }
    });
  }
});



// router.get('/project/add', function(req, res, next) {
//   res.render("add")
// });
// router.post('/project/add', function(req, res, next) {
//   res.render("project")
// });

return router;
}