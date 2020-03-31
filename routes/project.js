var express = require('express');
var router = express.Router();
const helpers = require('../helpers/mangat');
const moment = require('moment')
const path = require('path');
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
      let sqlProjects = `SELECT DISTINCT projects.projectid, projects.name, STRING_AGG(users.firstname || ' ' || users.lastname, ', ') as member FROM projects
      JOIN members ON members.projectid = projects.projectid
      JOIN users ON members.userid = users.userid`;

      if (result.length > 0) {
        sqlProjects += ` WHERE ${result.join(" AND ")}`;
      };

      sqlProjects += ` GROUP BY projects.projectid ORDER BY projectid ASC LIMIT ${limit} OFFSET ${offset}`;

      db.query(sqlProjects, (err, projectData) => {
        if (err) res.status(500).json(err);

        let sqlUsers = `SELECT userid, CONCAT(firstname, ' ', lastname) as name FROM users`;
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

  router.get("/overview/:projectid", helpers.isLoggedIn, (req, res, next) => {
    const { projectid } = req.params;
    let sql = `SELECT * FROM projects WHERE projectid=${projectid}`;
    let sql1 = `SELECT users.firstname, users.lastname , members.role FROM members 
        LEFT JOIN users ON members.userid = users.userid 
        LEFT JOIN projects ON members.projectid = projects.projectid
        WHERE members.projectid = ${projectid}`;
    let sql2 = `SELECT * FROM issues WHERE projectid = ${projectid}`
    db.query(sql, (err, getData) => {
      if (err) res.status(500).json(err)
      db.query(sql1, (err, dataUser) => {
        if (err) res.status(500).json(err)
        db.query(sql2, (err, dataIssues) => {
          if (err) res.status(500).json(err)
          let bugOpen = 0;
          let bugTotal = 0;
          let featureOpen = 0;
          let featureTotal = 0;
          let supportOpen = 0;
          let supportTotal = 0;

          dataIssues.rows.forEach(item => {
            if (item.tracker == 'bug' && item.status !== "Closed") {
              bugOpen += 1;
            }
            if (item.tracker == 'bug') {
              bugTotal += 1;
            }
          })
          dataIssues.rows.forEach(item => {
            if (item.tracker == 'feature' && item.status !== "Closed") {
              featureOpen += 1;
            }
            if (item.tracker == 'feature') {
              featureTotal += 1;
            }
          })

          dataIssues.rows.forEach(item => {
            if (item.tracker == 'support' && item.status !== "Closed") {
              supportOpen += 1;
            }
            if (item.tracker == 'support') {
              supportTotal += 1;
            }
          })

          res.render('projects/overview', {
            user: req.session.user,
            title: 'Darsboard Overview',
            url: 'projects',
            url2: 'overview',
            result: getData.rows[0],
            result2: dataUser.rows,
            result3: dataIssues.rows,
            bugOpen,
            bugTotal,
            supportOpen,
            supportTotal,
            featureOpen,
            featureTotal
          })
        })
      })
    })
  })

  router.get('/activity/:projectid', helpers.isLoggedIn, (req, res) => {
    const { projectid } = req.params;
    let sql = `SELECT activityid, (time AT TIME ZONE 'Asia/Jakarta' AT TIME ZONE 'asia/jakarta')::DATE dateactivity, (time AT TIME ZONE 'Asia/Jakarta' AT time zone 'asia/jakarta')::time timeactivity, title, description, CONCAT(users.firstname,' ',users.lastname) AS nama FROM activity 
              INNER JOIN users ON activity.author = users.userid
              WHERE projectid = ${projectid} ORDER BY activityid DESC`
    let sql2 = `SELECT DISTINCT members.projectid, projects.name projectname FROM members INNER JOIN projects USING (projectid) INNER JOIN users USING (userid) WHERE projectid=${projectid}`;
    console.log(sql)
    function convertDateTerm(date) {
      date = moment(date).format('YYYY-MM-DD')
      const today = moment().format('YYYY-MM-DD')
      const yesterday = moment().subtract(1, "days").format("YYYY-MM-DD");
      if (date == today) {
        return "Today";
      } else if (date == yesterday) {
        return "Yesterday"
      }
      return moment(date).format("MMMM Do, YYYY")
    }
    db.query(sql, (err, dataActivity) => {
      if (err) res.status(500).json(err)
      db.query(sql2, (err, getData) => {
        if (err) res.status(500).json(err)

        let result2 = getData.rows;
        let result3 = dataActivity.rows;

        result3 = result3.map(data => {
          data.dateactivity = moment(data.dateactivity).format('YYYY-MM-DD')
          data.timeactivity = moment(data.timeactivity, 'HH:mm:ss.SSS').format('HH:mm:ss')
          return data
        })
        let dateonly = result3.map(data => data.dateactivity)
        dateunix = dateonly.filter((date, index, arr) => {
          return arr.indexOf(date) == index
        })

        let activitydate = dateunix.map(date => {
          let dataindate = result3.filter(item => item.dateactivity == date);
          return {
            date: convertDateTerm(date),
            data: dataindate
          }
        })

        projectname = result2.map(data => data.projectname)
        let sql2 = `SELECT * FROM projects WHERE projectid = ${projectid}`;
        db.query(sql2, (err, data) => {
          if (err) res.status(500).json(err)
          res.render('projects/activity', {
            user: req.session.user,
            title: 'Darsboard Activity',
            url: 'projects',
            url2: 'activity',
            result: data.rows[0],
            activitydate,
            result3,
            moment
          })
        })
      })
    })
  })


  router.get("/member/:projectid", helpers.isLoggedIn, (req, res, next) => {
    const { projectid } = req.params;
    const link = (req.url == `/member/${projectid}`) ? `/member/${projectid}/?page=1` : req.url;
    let page = req.query.page || 1;
    let limit = 3;
    let offset = (page - 1) * limit
    const { checkID, inputID, checkName, inputName, checkPosition, inputPosition } = req.body;
    let filter = [];

    if (checkID && inputID) {
      filter.push(`members.id = ${inputID}`)
    };
    if (checkName && inputName) {
      filter.push(`CONCAT (users.firstname, ' ', users.lastname) ILIKE '%${inputName}%'`)
    };
    if (checkPosition && inputPosition) {
      filter.push(`members.role = ${inputPosition}`)
    };

    let sql = `SELECT COUNT (member) AS total  FROM (SELECT members.userid FROM members
      JOIN users ON members.userid = users.userid WHERE members.projectid = ${projectid}`;

    if (filter.length > 0) {
      sql += ` AND ${filter.join(' AND ')}`;
    };
    sql += `) AS member`;

    db.query(sql, (err, count) => {
      if (err) res.status(500).json(err);

      const total = count.rows[0].total;
      const pages = Math.ceil(total / limit);
      let sqlMembers = `SELECT projects.projectid, members.id, members.role, CONCAT (users.firstname,' ',users.lastname) AS name FROM members
        LEFT JOIN projects ON projects.projectid = members.projectid
        LEFT JOIN users ON users.userid = members.userid WHERE members.projectid = ${projectid}`;

      if (filter.length > 0) {
        sql += ` AND ${filter.join(' AND ')}`;
      };
      sql += ` ORDER BY members.id LIMIT ${limit} OFFSET ${offset}`

      db.query(sqlMembers, (err, membersData) => {
        if (err) res.status(500).json(err);
        let sqlData = `SELECT * FROM projects WHERE projectid = ${projectid}`;
        db.query(sqlData, (err, data) => {
          if (err) res.status(500).json(err);
          res.render("projects/member", {
            title: "Members",
            user: req.session.user,
            data: membersData.rows,
            result: data.rows[0],
            projectid,
            url: "projects",
            subUrl: "members",
            page,
            totalPage: pages,
            link
          });
        });
      });
    });
  })

  // project member addition page
  router.get('/member/:projectid/addmember', helpers.isLoggedIn, (req, res, next) => {
    const user = req.session.user;
    const { projectid } = req.params;
    let sqlone = `SELECT * FROM projects WHERE projectid=${projectid}`;
    db.query(sqlone, (err, data) => {
      if (err) res.status(500).json(err);
      let sql = `SELECT userid, email, CONCAT(firstname,' ',lastname) AS name FROM users WHERE userid NOT IN (SELECT userid FROM members WHERE projectid=${projectid})`;
      db.query(sql, (err, usersData) => {
        if (err) res.status(500).json(err);
        if (usersData.rows.length > 0) {
          res.render('projects/addmember', {
            user,
            title: 'PMS Dashboard',
            url: 'project',
            url2: 'member',
            result: data.rows[0],
            usersData: usersData.rows,
            memberMessage: req.flash('memberMessage')
          })
        } else {
          req.flash('memberMessage', `Member on ${data.rows[0].name} is full`)
          res.redirect(`/projects/member/${projectid}`);
        }
      })
    })
  })

  router.post("/member/:projectid/addmember", helpers.isLoggedIn, (req, res, next) => {
    const { projectid } = req.params
    const { inputMember, inputPosition } = req.body
    let sql = `INSERT INTO members(userid, role, projectid) VALUES(${inputMember}, '${inputPosition}', ${projectid})`
    db.query(sql, (err) => {
      if (err) res.status(500).json(err);
      res.redirect(`/project/member/${projectid}`);
    });
  });

  router.get('/member/:projectid/editmember/:memberid', helpers.isLoggedIn, (req, res) => {
    const { projectid, memberid } = req.params
    let sqlProject = `SELECT * FROM projects WHERE projectid = ${projectid}`
    db.query(sqlProject, (err, dataProject) => {
      if (err) res.status(500).json(err)
      let sqlMember = `SELECT projects.projectid, users.userid , users.firstname, users.lastname, members.role, members.id FROM members
          LEFT JOIN projects ON members.projectid = projects.projectid 
          LEFT JOIN users ON members.userid = users.userid 
          WHERE projects.projectid=${projectid} AND id=${memberid}`;
      db.query(sqlMember, (err, dataMember) => {
        if (err) res.status(500).json(err)
        res.render('projects/editmember', {
          user: req.session.user,
          title: 'Dasrboard Edit Members',
          url: 'projects',
          url2: 'members',
          result: dataProject.rows[0],
          result2: dataMember.rows[0]
        })
      })
    })
  })

  router.get('/member/:projectid/delete/:memberid', helpers.isLoggedIn, (req, res) => {
    const { projectid, memberid } = req.params
    let sql = `DELETE FROM members WHERE projectid=${projectid} AND id=${memberid}`;
    db.query(sql, (err) => {
      if (err) res.status(500).json(err)
      res.redirect(`/project/member/${projectid}`)
    })
  })

  router.get("/issues/", helpers.isLoggedIn, (req, res, next) => {
    const { projectid } = req.params;
    let sqlData = `SELECT * FROM projects WHERE projectid = $1`;

    db.query(sqlData, [projectid], (err, data) => {
      if (err) res.status(500).json(err);
      res.render("projects/issues", {
        title: "Issues",
        user: req.session.user,
        url: "projects",
        subUrl: "issues",
        result: data.rows[0]
      });
    });
  });

  //get page project/ Issuess
  router.get('/issues/:projectid', helpers.isLoggedIn, (req, res) => {
    const { projectid } = req.params;
    const { cissues, csubject, ctracker, issues, subject, tracker } = req.query
    let sql = `SELECT count(total) AS total FROM (SELECT i1.*, users.userid, concat(users.firstname, ' ', users.lastname) as fullname, concat(u2.firstname, ' ', u2.lastname) author FROM issues i1 INNER JOIN users ON  users.userid = i1.assignee INNER JOIN users u2 ON i1.author = u2.userid  WHERE projectid = ${projectid}`;
    // start filter logic
    let result = []

    if (cissues && issues) {
      result.push(`issueid = ${issues}`)
    }
    if (csubject && subject) {
      result.push(`subject LIKE '%${subject}%'`)
    }
    if (ctracker && tracker) {
      result.push(`tracker = '${tracker}'`)
    }
    if (result.length > 0) {
      sql += ` AND ${result.join(' AND ')}`
    }

    sql += `) AS total`
    // end filter logic
    db.query(sql, (err, totalData) => {
      if (err) res.status(500).json(err)

      // start pagenation members logic
      const link = (req.url == `/issues/${projectid}`) ? `/issues/${projectid}/?page=1` : req.url;
      const page = req.query.page || 1;
      const limit = 3;
      const offset = (page - 1) * limit;
      const total = totalData.rows[0].total
      const pages = Math.ceil(total / limit);
      let getIssues = `SELECT i1.*, users.userid, concat(users.firstname, ' ', users.lastname) as nama, concat(u2.firstname, ' ', u2.lastname) author FROM issues i1 
        LEFT JOIN users ON  users.userid = i1.assignee 
        LEFT JOIN users u2 ON i1.author = u2.userid  WHERE projectid = ${projectid}`;

      if (result.length > 0) {
        getIssues += ` AND ${result.join(' AND ')}`
      }

      getIssues += ` ORDER BY issueid ASC`
      getIssues += ` LIMIT ${limit} OFFSET ${offset}`
      // end pagenation members logic
      db.query(getIssues, (err, dataIssues) => {
        if (err) res.status(500).json(err)
        let result2 = dataIssues.rows.map(item => {
          item.startdate = moment(item.startdate).format('LL')
          item.duedate = moment(item.duedate).format('LL')
          item.createdate = moment(item.createdate).format('LL')
          return item;
        });
        let getProject = `SELECT * FROM projects WHERE projectid = ${projectid}`
        db.query(getProject, (err, data) => {
          if (err) res.status(500).json(err)
          let issues = `SELECT * FROM issues WHERE projectid = ${projectid} ORDER BY issueid ASC`;
          db.query(issues, (err, issuesData) => {
            if (err) res.status(500).json(err)
            res.render('projects/issues', {
              user: req.session.user,
              title: 'Darsboard Issues',
              url: 'projects',
              url2: 'issues',
              result: data.rows[0],
              result2,
              moment,
              link,
              pages,
              page,
              memberMessage: req.flash('memberMessage'),
              result3: issuesData.rows[0]
            })
          })
        })
      })
    })
  })
  //get page project/ Issuess / add
  router.get('/issues/:projectid/addissues', helpers.isLoggedIn, (req, res) => {
    const { projectid } = req.params;
    let getProject = `SELECT * FROM projects WHERE projectid=${projectid}`;
    let getUser = `SELECT users.userid, CONCAT(users.firstname,' ',users.lastname) as name , projects.projectid FROM members 
  LEFT JOIN users ON members.userid = users.userid
  LEFT JOIN projects ON members.projectid = projects.projectid WHERE members.projectid = ${projectid}`;
  console.log(getUser)
    db.query(getUser, (err, dataUser) => {
      if (err) res.status(500).json(err)
      db.query(getProject, (err, getData) => {
        if (err) res.status(500).json(err)
        res.render('projects/addissues', {
          user: req.session.user,
          title: 'Issues Add',
          title2: 'New Issues',
          url: 'project',
          url2: 'issues',
          result: getData.rows[0],
          result2: dataUser.rows
        })
      })
    })
  })

  router.post('/issues/:projectid/addissues', (req, res) => {
    const { projectid } = req.params;
    const user = req.session.user;
    const { tracker, subject, description, status, priority, assignee, startdate, duedate, estimatetime, done, file } = req.body;
    const addIssues = `INSERT INTO issues (projectid, userid, tracker, subject, description, status, priority, assignee, startdate, duedate, estimatedate, done, files, author, createdate) 
                      VALUES($1,${user.userid},$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,${user.userid},NOW())`;
    const issuesData = [projectid, tracker, subject, description, status, priority, assignee, startdate, duedate, estimatetime, done, file]
    if (req.files) {
      let file = req.files.file;
      let fileName = file.name.toLowerCase().replace("", Date.now()).split(' ').join('-');
      file.mv(path.join(__dirname, "..", 'public', "images", fileName), function (err) {
        if (err) res.status(500).json(err);
        issuesData[11] = `/images/${fileName}`;
        db.query(addIssues, issuesData, (err) => {
          if (err) res.status(500).json(err);
          const addActivity = `INSERT INTO activity (projectid, time, title, description, author) VALUES ($1, NOW(), $2,'[${status}] [${tracker}] [${subject}] - Done: ${done}%', ${user.userid})`
          const activityData = [projectid, subject];
          db.query(addActivity, activityData, (err) => {
            if (err) res.status(500).json(err);
            res.redirect(`/project/issues/${projectid}`);
          })
        })
      });
    } else {
      db.query(addIssues, issuesData, (err) => {
        if (err) res.status(500).json(err);
        const addActivity = `INSERT INTO activity (projectid, time, title, description, author) VALUES ($1, NOW(), $2,'[${status}] [${tracker}] [${subject}] - Done: ${done}%', ${user.userid})`
        const activityData = [projectid, subject];
        db.query(addActivity, activityData, (err) => {
          if (err) res.status(json).status(err)
          res.redirect(`/project/issues/${projectid}`);
        })
      })
    }
  });

  router.get('/issues/:projectid/editissues/:issueid', helpers.isLoggedIn, (req, res) => {
    const { projectid, issueid } = req.params;
    let getProject = `SELECT i1.*, projects.name FROM issues i1 
      LEFT JOIN projects ON i1.projectid = projects.projectid
      WHERE issueid = ${issueid}
      AND projects.projectid = ${projectid}`;
    let getUser = `SELECT users.userid, CONCAT(users.firstname,' ',users.lastname) as name , projects.projectid FROM members 
      LEFT JOIN users ON members.userid = users.userid
      LEFT JOIN projects ON members.projectid = projects.projectid WHERE members.projectid = ${projectid}`;
    let getIssues = `SELECT issueid, subject, tracker FROM issues WHERE issueid  NOT IN (SELECT issueid FROM issues WHERE issueid = $1) GROUP BY issueid HAVING projectid = $2`
    db.query(getProject, (err, getData) => {
      if (err) res.status(500).json(err)
      db.query(getUser, (err, dataUser) => {
        if (err) res.status(500).json(err)
        db.query(getIssues, [issueid, projectid], (err, dataIssues) => {
          if (err) res.status(500).json(err)
          res.render('projects/editissues', {
            user: req.session.user,
            title: 'Issues Edit',
            title2: 'Edit Issues',
            url: 'projects',
            url2: 'issues',
            result: getData.rows[0],
            result2: dataUser.rows,
            result3: dataIssues.rows,
            moment
          })
        })
      })
    })
  })

  router.post('/issues/:projectid/editissues/:issueid', (req, res) => {
    const { projectid, issueid } = req.params;
    const userid = req.session.user.userid;
    const {
      tracker,
      subject,
      description,
      status,
      priority,
      assignee,
      duedate,
      done,
      file,
      spenttime,
      targetversion,
      author,
      parenttask
    } = req.body;
    let updateIssue = `UPDATE issues SET
    tracker = '${tracker}',
    subject = '${subject}',
    description = '${description}',
    status = '${status}',
    priority = '${priority}',
    assignee = ${assignee},
    duedate = '${duedate}',
    done = ${done},
    files = '${file}',
    spenttime = ${spenttime},
    targetversion = '${targetversion}',
    author = ${userid},
    updatedate = '${duedate}',
    parenttask = ${parenttask}
    WHERE issueid = ${issueid}`;
    console.log(updateIssue)
    // let issuesData = [
    //   tracker,
    //   subject,
    //   description,
    //   status,
    //   priority,
    //   assignee,
    //   duedate,
    //   done,
    //   file,
    //   spenttime,
    //   targetversion,
    //   author,
    //   userid,
    //   parenttask,
    //   issueid
    // ];
    // if (req.files) {
    //   let file = req.files.file;
    //   let fileName = file.name.toLowerCase().replace("", Date.now()).split(' ').join('-');
    //   file.mv(path.join(__dirname, "..", 'public', "images", fileName), (err) => {
    //     if (err) res.status(500).json(err);
    //     // issuesData[8] = `/images/${fileName}`;
    //     db.query(updateIssue, (err,) => {
    //       if (err) res.status(500).json(err)
    //       const addActivity = `INSERT INTO activity (projectid, time, title, description, author) VALUES ($1, NOW(), $2,'[${status}] [${tracker}] [${subject}] - Done: ${done}%', $3)`
    //       const activityData = [projectid, subject, userid];
    //       db.query(addActivity, activityData, (err) => {
    //         if (err) res.status(500).json(err);
    //         res.redirect(`/project/issues/${projectid}`)
    //       })
    //     })
    //   })
    // } else {
      db.query(updateIssue,(err) => {
        if (err) res.status(500).json(err)
         const addActivity = `INSERT INTO activity (projectid, time, title, description, author) VALUES ($1, NOW(), $2,'[${status}] [${tracker}] [${subject}] - Done: ${done}%', $3)`
         const activityData = [projectid, subject, userid];
         db.query(addActivity, activityData, (err) => {
           if (err) res.status(500).json(err)
          res.redirect(`/project/issues/${projectid}`)
        })
       })
    })
  // })

  router.get('/issues/:projectid/delete/:issueid', (req, res) => {
    const { projectid, issueid } = req.params
    let deleteIssues = `DELETE FROM issues WHERE issueid = ${issueid}`;
    db.query(deleteIssues, (err) => {
        if (err) res.status(500).json(err)
        res.redirect(`/project/issues/${projectid}`)
    })
})

  return router;
}


