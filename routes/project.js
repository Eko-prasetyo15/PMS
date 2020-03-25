var express = require('express');
var router = express.Router();
const helpers = require('../helpers/mangat');
const bcrypt = require('bcrypt');
const saltRounds = 10;
/* GET users listing. */

module.exports = db => {
  /* GET home page. */
  router.get('/', helpers.isLoggedIn, (req, res, next) => {
    let sqlpro = `SELECT DISTINCT projects.projectid, projects.name, STRING_AGG(users.firstname || ' ' || users.lastname, ', ') as member FROM projects
      JOIN members ON members.projectid = projects.projectid
      JOIN users ON members.userid = users.userid
      GROUP BY projects.projectid`;
    console.log(sqlpro)
    const { checkId, inputId, checkName, inputName, checkMember, inputMember } = req.query
    let result = [];
    if (checkId && inputId) {
      result.push(`projects.projectid = ${inputId}`);
      filterData = true;
    };
    if (checkName && inputName) {
      result.push(`projects.name = ${inputName}`);
      fiterData = true;
    }
    if (checkMember && inputMember) {
      result.push(`members.userid = ${member}`)
      filterData = true;
    }
    if (result.length > 0) {
      sqlpro += ` WHERE ${result.join(" AND ")}`;
    };
    sqlpro += ` ORDER BY projects.projectid`;

    let sqlusers = `SELECT CONCAT(firstname, ' ', lastname) as name FROM users`;
    db.query(sqlusers, (err, usersData) => {
      if (err) res.status(500).json(err);

      db.query(sqlpro, (err, projectData) => {
        res.render('projects/project', {
          title: "Projects",
          url: "projects",
          user: req.session.user,
          data: projectData.rows,
          usersData: usersData.rows
        })
      });
    })
  })
  router.get("/addproject", helpers.isLoggedIn, (req, res, next) => {
    let sql = `SELECT * FROM users ORDER BY userid`;
    db.query(sql, (err, data) => {
      if (err) res.status(500).json(err);
      let result = data.rows.map(item => item);

      res.render("projects/addproject", {
        title: "Add Project",
        url: "projects",
        result
      });
    });
  });

  router.post("/addproject", helpers.isLoggedIn, (req, res, next) => {
    const { name, member } = req.body;
    if (name && member) {
      let sqlpro = `INSERT INTO projects (name) VALUES ('${name}')`;
      console.log(sqlpro)
      db.query(sqlpro, (err, data) => {
        if (err) res.status(500).json(err);

        let sqlMax = `SELECT MAX (projectid) FROM projects`;
        db.query(sqlMax, (err, dataMax) => {
          if (err) res.status(500).json(err);

          let resultMax = dataMax.rows[0].max;
          let sqlMember = `INSERT INTO members (userid, role, projectid) VALUES`;
          if (typeof member == "string") {
            sqlMember += ` (${member}, ${resultMax})`;
          } else {
            let members = member.map(item => {
              return `(${item}, ${resultMax})`;
            }).join(",");
            sqlMember += `${members}`;
          }
          db.query(sqlMember, err => {
            if (err) res.status(500).json(err);
            res.redirect("/project");
          });
        });
      });
    } else {
      req.flash("projectMessage", "Please add project name and members!");
      res.redirect("/project/addproject");
    }
  });

  return router;
}

router.get('project/delete/:projectid', helpers.isLoggedIn, (req, res, next) => {
  const projectid = req.params.projectid;
  let sqlDeleteProject = `DELETE FROM members WHERE projectid=${projectid};
                          DELETE FROM projects WHERE projectid=${projectid}`;
  db.query(sqlDeleteProject, (err) => {
    if (err) res.status(500).json(err)
    res.redirect('/projects');
  })
})

router.get("/overview/:projectid", helpers.isLoggedIn, (req, res) => {
  const { projectid } = req.params;
  let getProject = `SELECT * FROM projects WHERE projectid=${projectid}`;

  db.query(getProject, (err, getData) => {
    if (err) res.status(500).json(err)
    res.render('projects/overview', {
      user: req.session.user,
      title: 'Dashboard Overview',
      url: 'projects',
      url2: 'overview',
      result: getData.rows[0]
    })
  })
})