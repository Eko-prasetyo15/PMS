var express = require('express');
var router = express.Router();
const helpers = require('../helpers/mangat');
const bcrypt = require('bcrypt');
const saltRounds = 10;
/* GET users listing. */

module.exports = db => {
  /* GET home page. */
  router.get("/", helpers.isLoggedIn, (req, res, next) => {
    let sqlProjects = `SELECT COUNT(ID) AS TOTAL FROM (SELECT DISTINCT projects.projectid as id FROM projects
      LEFT JOIN members ON members.projectid = projects.projectid
      LEFT JOIN users ON users.userid = members.userid`;
      const page = req.query.page || 1;
      const limit = 3;
      const offset = (page - 1) * limit;
      const link = req.url == "/" ? "/?page=1" : req.url;
    const { checkId, inputId, checkName, inputName, checkMember, inputMember } = req.query;
    let result = [];

    if (checkId && inputId) {
      result.push(`projects.projectid = ${inputId}`);
    };
    if (checkName && inputName) {
      result.push(`projects.name ILIKE '%${inputName}%'`);
    };
    if (checkMember && inputMember) {
      result.push(`members.userid = ${inputMember}`);
    };
    if (result.length > 0) {
      sqlProjects += ` WHERE ${result.join(" AND ")}`;
    };

    sqlProjects += `) AS total`;
    db.query(sqlProjects, (err, dataProjects) => {
      if (err) res.status(500).json(err);

      const total = dataProjects.rows[0].total;
      const pages = Math.ceil(total / limit);
      let sqlProjects = `SELECT DISTINCT projects.projectid, projects.name, STRING_AGG(users.firstname || ' ' || users.lastname, ', ') as membersname FROM projects
      JOIN members ON members.projectid = projects.projectid
      JOIN users ON members.userid = users.userid`;
      
      if (result.length > 0) {
        sqlProjects += ` WHERE ${result.join(" AND ")}`;
      };

      sqlProjects += ` GROUP BY projects.projectid ORDER BY projectid ASC LIMIT ${limit} OFFSET ${offset}`;

      db.query(sqlProjects, (err, projectData) => {
        if (err) res.status(500).json(err);

        let sqlUsers = `SELECT userid, CONCAT(firstname, ' ', lastname) as fullname FROM users`;
        db.query(sqlUsers, (err, usersData) => {
          if (err) res.status(500).json(err);

          res.render("projects/project", {
            title: "Projects",
            url: "projects",
            query: req.query,
            user: req.session.user,
            data: projectData.rows,
            usersData: usersData.rows,
            pages,
            page,
            link
          });
        });
      });
    });
  });
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
  router.get('/edit/:projectid', helpers.isLoggedIn, (req, res) => {
    let projectid = req.params.projectid;
    let sql = `SELECT members.userid, projects.name, projects.projectid FROM projects LEFT JOIN members ON members.projectid = projects.projectid  WHERE projects.projectid = ${projectid}`;
    let sql2 = `SELECT members.userid, projects.name, projects.projectid FROM members LEFT JOIN projects ON members.projectid = projects.projectid  WHERE projects.projectid = ${projectid};`
    let sql3 = `SELECT * FROM users`;

    db.query(sql, (err, data) => {
      if (err) res.status(500).json(err)
      let dataProject = data.rows[0];
      db.query(sql2, (err, data) => {
        if (err) res.status(500).json(err)
        db.query(sql3, (err, dataUsers) => {
          let dataUser = dataUsers.rows;
          if (err) res.status(500).json(err)
          res.render('projects/editproject', {
            title: 'Dasboard Edit Project',
            url: 'projects',
            user: req.session.user,
            project: dataProject,
            dataUser,
            dataMembers: data.rows.map(item => item.userid)
          })
        })
      })
    })
  })
  router.post('/edit/:projectid', helpers.isLoggedIn, (req, res) => {
    const { editname, editmember } = req.body;
    let projectid = req.params.projectid;
    let sql = `UPDATE projects SET name= '${editname}' WHERE projectid = ${projectid}`
    db.query(sql, (err) => {
        if (err) res.status(500).json(err)
        let sqlDeleteMember = `DELETE FROM members WHERE projectid = ${projectid}`;

        db.query(sqlDeleteMember, (err) => {
            if (err) res.status(500).json(err)
            let result = [];
            if (typeof editmember == "string") {
                result.push(`(${editmember}, ${projectid})`);
            } else {
                for (let i = 0; i < editmember.length; i++) {
                    result.push(`(${editmember[i]}, ${projectid})`);
                }
            }
            let sqlUpdate = `INSERT INTO members (userid, role, projectid) VALUES ${result.join(",")}`;
            db.query(sqlUpdate, (err) => {
                if (err) res.status(500).json(err)
                res.redirect('/project')
            })
        })
    })
})
  router.get('/delete/:projectid', helpers.isLoggedIn, (req, res, next) => {
    const projectid = req.params.projectid;
    let sqlDeleteProject = `DELETE FROM members WHERE projectid=${projectid};
                            DELETE FROM projects WHERE projectid=${projectid}`;
    console.log(sqlDeleteProject)
    db.query(sqlDeleteProject, (err) => {
      if (err) res.status(500).json(err)
      res.redirect('/project');
    })
  })


  router.get("/overview", helpers.isLoggedIn, (req, res, next) => {
    res.render("projects/overview", {
      title: "Overview",
      user: req.session.user,
      url: "projects",
      subUrl: "overview"
    });
  });


  return router;
}


