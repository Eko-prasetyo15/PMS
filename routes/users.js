var express = require('express');
var router = express.Router();
const helpers = require('../helpers/mangat')
const bcrypt = require('bcrypt');
const saltRounds = 10;
/* GET users listing. */

module.exports = (db) => {
    /* GET home page. */
    router.get('/',(req, res, next) => {
        res.render('Users/users')
      });

    router.get('/addusers',(req, res, next) => {
        res.render('Users/addusers');
    });

    return router;
}
