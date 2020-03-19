var express = require('express');
var router = express.Router();
const bcrypt = require('bcrypt');
const saltRounds = 10;
/* GET users listing. */

module.exports = function (pool) {
  /* GET home page. */
  router.get('/', (req, res, next) => {
    res.render('projects/project');
  })
  
router.get('/addproject', (req, res, next) => {
  res.render('projects/addproject');
})
router.post('/addproject', (req, res, next) => {
  res.redirect("addproject")
})

return router;
}
