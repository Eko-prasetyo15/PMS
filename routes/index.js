var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('login');
});

router.get('/project', function(req, res, next) {
  res.render('project', {title: "web"});
});

router.post('/login', function(req, res, next) {
  res.redirect('project');
});

router.get('/logout', function(req, res, next) {
  if (req.session) {
    // delete session object
    req.session.destroy(function(err) {
      if(err) {
        return next(err);
      } else {
        return res.redirect('/login');
      }
    });
  }
});

router.get('/users', function(req, res, next) {
  res.render('Users');
});

router.post('/project', function(req, res, next) {
  res.redirect('Users');
});

router.get('/project/add', function(req, res, next) {
  res.render("add")
});



module.exports = router;
