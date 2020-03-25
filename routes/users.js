var express = require('express');
var router = express.Router();
const helpers = require('../helpers/mangat');
const bcrypt = require('bcrypt');
const saltRounds = 10;
/* GET users listing. */

module.exports = (db) => {
    /* GET users listing. */
    router.get("/", helpers.isLoggedIn, (req, res) => {
        const link = req.url == "/" ? "/?page=1" : req.url;
        let sql = `SELECT userid, email, CONCAT(firstname,' ',lastname) as name, position, typejob FROM users`;
        // filter users
        let result = [];
        const {
            checkId,
            inputId,
            checkName,
            inputName,
            checkEmail,
            inputEmail,
            checkPosition,
            inputPosition,
            checkTypeJob,
            inputTypeJob
        } = req.query;

        if (checkId && inputId) {
            result.push(`userid = ${inputId}`);
            filterData = true;
        }
        if (checkName && inputName) {
            result.push(`firstname = '${inputName}'`);
            filterData = true;
        }
        if (checkEmail && inputEmail) {
            result.push(`email = '${inputEmail}'`);
            filterData = true;
        }
        if (checkPosition && inputPosition) {
            result.push(`position = '${inputPosition}'`);
            filterData = true;
        }
        if (checkTypeJob && inputTypeJob) {
            result.push(`typejob = ${inputTypeJob == "Full Time" ? true : false}`);
            filterData = true;
        }

        if (result.length > 0) {
            sql += ` WHERE ${result.join(" AND ")}`;
        }

        const page = req.query.page || 1;
        const limit = 3;
        const offset = (page - 1) * limit;

        db.query(sql, (err, data) => {
            if (err) res.status(500).json(err);

            const pages = Math.ceil(data.rows.length / limit);

            sql += ` LIMIT ${limit} OFFSET ${offset}`;
            db.query(sql, (err, data) => {
                if (err) res.status(500).json(err);
                res.render("users/list", {
                    user: req.session.user,
                    data: data.rows,
                    title: "Users",
                    pages,
                    page,
                    link,
                    url: 'users',
                    query: req.query
                });
            });
        });
    });


    router.get("/addusers", helpers.isLoggedIn, (req, res) => {
        res.render("users/addusers", {
            title: "Add User",
            url: 'users'
        });
    });


    router.post('/addusers', (req, res) => {
        const { email, password, firstname, lastname, position, typejob } = req.body;
        let sql = `INSERT INTO users (email, password, firstname, lastname, position, typejob) VALUES ('${email}', '${password}', '${firstname}', '${lastname}', '${position}', '${typejob}')`
        console.log(sql)
        db.query(sql, (err) => {
            if (err) res.status(500).json(err);
            res.redirect("/users")
        })
    })

    router.get("/editusers/:userid", helpers.isLoggedIn, (req, res) => {
        const { userid } = req.params;
        db.query(`SELECT * FROM users WHERE userid = $1`, [userid], (err, data) => {
            if (err) res.status(500).json(err);
            res.render("users/editusers", {
                title: "Edit Users",
                query: req.query,
                data: data.rows[0],
                url: 'users',
            });
        });
    });

    router.post("/editusers/:userid", helpers.isLoggedIn, (req, res) => {
        const {
            firstname,
            lastname,
            email,
            password,
            position,
            typejob
        } = req.body;
        const { userid } = req.params;
            if (!password) {
                sql1 = `UPDATE users SET firstname = '${firstname}', lastname = '${lastname}', email = '${email}', position = '${position}', typejob = '${typejob}' WHERE userid = ${userid}`;
            } else {
                sql1 = `UPDATE users SET firstname = '${firstname}', lastname = '${lastname}', email = '${email}', password = '${password}', position = '${position}', typejob = '${typejob}' WHERE userid= ${userid}`;
            };
            db.query(sql1, (err, data) => {
                if (err) res.status(500).json(err);
                res.redirect("/users");
        });
    });

    router.get("/delete/:userid", helpers.isLoggedIn, (req, res) => {
        const { userid } = req.params;
        db.query(`DELETE FROM users WHERE userid = $1`, [userid], (err, data) => {
            if (err) res.status(500).json(err);
            res.redirect("/users");
        });
    });

    return router;
}
