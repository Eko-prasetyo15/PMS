var express = require('express');
var router = express.Router();
const bcrypt = require('bcrypt');
const saltRounds = 10;
/* GET users listing. */

module.exports = function (pool) {
  /* GET home page. */
  router.get('/', function(req, res, next) {
    res.render('profile');
  })

router.post('/profile', function(req, res, next) {
  res.redirect('profile');
});

return router;
}
