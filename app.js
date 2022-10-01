require("dotenv").config();
const bodyParser = require("body-parser");
const express = require("express");
const session = require("express-session");
const https = require("https");
const cors = require("cors");
const _ = require("lodash");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const mongoose = require("mongoose");
const findOrCreate = require("mongoose-findorcreate");

// INITIALIZE MALWARES

const app = express();
app.use(express.json());
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
  })
);
app.use(passport.initialize());
app.use(passport.session());

// DATABASE CONNECTION - MONGODB

// mongoose.connect(process.env.MONGO_URL, {
//   useNewUrlParser: true,
//   useUnifiedTopology: true,
// })

mongoose.connect("mongodb://localhost:27017/cutstructDB", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// SCHEMA DEFINITIONS

const taskSchema = new mongoose.Schema({
  name: String,
  status: String,
});

const userSchema = new mongoose.Schema({
  username: String,
  lastName: String,
  firstName: String,
  role: String,
  country: String,
  phone: Number,
  users: [],
  projects: [],
});

const projectSchema = new mongoose.Schema({
  key: String, // Name-Company
  name: String,
  company: String,
  users: [userSchema],
  tasks: [taskSchema],
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

// MODEL DEFINITIONS

const User = mongoose.model("User", userSchema);
const Project = mongoose.model("Project", projectSchema);
const Task = mongoose.model("Task", taskSchema);

passport.use(User.createStrategy());

// GLOBAL SERIALIZATION

passport.serializeUser(function (user, done) {
  done(null, user.id);
});

passport.deserializeUser(function (id, done) {
  User.findById(id, function (err, user) {
    done(err, user);
  });
});

app.get("/", (req, res) => {
  res.send("Cutstruct server is running ... ");
});

app.get("/admin", (req, res) => {
  res.send("Cutstruct Admin end point ... ");
});

app.post("/login", function (req, res) {
  const user = new User({
    username: req.body.username,
    password: req.body.password,
  });

  passport.authenticate("local", function (err, user, info) {
    if (err) {
      res.send({ status: 401, response: err });
      return;
    } else {
      req.logIn(user, function (error, resp) {
        //This creates a log in session
        if (error) {
          res.send({ status: 401, response: "Invalid username or password" });
        } else {
          res.send({ status: 200, response: "Logged in..." });
        }
      });
    }
  })(req, res);
});

app.get("/logout", function (req, res) {
  req.logout((err) => {
    err
      ? res.send({ status: 404, response: err })
      : res.send({ status: 200, response: "Logged out..." });
  });
  // res.redirect("/login");
});

app.post("/register", function (req, res) {
  User.register(
    {
      username: req.body.username,
    },
    req.body.password,
    function (err) {
      if (err) {
        console.log("err");
        res.send({ status: 401, response: err });
      } else {
        passport.authenticate("local")(req, res, function () {
          User.updateOne(
            {
              _id: req.user.id,
            },
            {
              firstName: _.capitalize(req.body.firstName),
              lastName: _.capitalize(req.body.lastName),
              role: "Admin",
              country: _.capitalize(req.body.country),
              phone: req.body.phone,
            },
            function (err) {
              if (!err) {
                // LOG IN USER AFTER REGISTRATION
                const user = new User({
                  username: req.body.username,
                  password: req.body.password,
                });

                passport.authenticate("local", function (err, user, info) {
                  if (err) {
                    res.send({ status: 404, response: err });
                  }
                  if (!user) {
                    res.send({ status: 401, response: err });
                  }

                  req.logIn(user, function (err) {
                    if (err) {
                      res.send({ status: 401, response: err });
                    } else {
                      res.send({ status: 200, response: "Registered" });
                    }
                  });
                })(req, res);
              } else {
                res.send({ status: 401, response: err });
              }
            }
          );
        });
      }
    }
  );
});

// Endpoint for Users -----------------------------------------------

app.get("/users", function (req, res) {
  User.find({}, function (err, users) {
    if (err) {
      res.send({ status: 404, response: err });
    } else {
      res.send({ status: 200, data: users });
    }
  });
});

app.post("/users", function (req, res) {
  User.register(
    {
      username: req.body.username,
    },
    req.body.password,
    function (err) {
      if (err) {
        console.log("err");
        res.send({ status: 401, response: err });
      } else {
        passport.authenticate("local")(req, res, function () {
          User.updateOne(
            {
              _id: req.user.id,
            },
            {
              firstName: _.capitalize(req.body.firstName),
              lastName: _.capitalize(req.body.lastName),
              role: "User",
              country: _.capitalize(req.body.country),
              phone: req.body.phone,
            },
            function (err) {
              if (!err) {
                User.findById(req.user, function (err, admin) {
                  if (err) {
                    res.send({ status: 404, response: err });
                  } else {
                    console.log(admin);
                    let newUser = {
                      username: req.body.username,
                      firstName: _.capitalize(req.body.firstName),
                      lastName: _.capitalize(req.body.lastName),
                      country: _.capitalize(req.body.country),
                      phone: req.body.phone,
                    };
                    admin.users.push(newUser);
                    admin.save(function (err) {
                      if (err) {
                        console.log("err");
                        res.send({ status: 504, response: err });
                      } else {
                        res.send({
                          status: 200,
                          response: "New User has been created and added",
                        });
                      }
                    });
                  }
                });

                // User.findById({ _id: projectUserId }, function (err, user) {
                //   User.findOneAndUpdate(
                //     {
                //       _id: req.user,
                //       username: req.user.username,
                //       role: "Admin",
                //       // "projects.users": currentCourse.title,
                //       // "course.$[outer].modules.$[inner].lesson": currentLesson,
                //     },
                //     {
                //       $push: {
                //         "projects.$[first].users": user,
                //       },
                //     },
                //     {
                //       arrayFilters: [{ "first.company": projectCompany }],
                //     },
                //     function (err, found) {
                //       if (err) {
                //         res.send({ status: 404, response: err });
                //       } else {
                //         console.log("found");
                //         res.send({
                //           status: 200,
                //           response: "User has been added to project",
                //         });
                //       }
                //     }
                //   );
                // });
              } else {
                res.send({ status: 404, response: err });
              }
            }
          );
        });
      }
    }
  );
});

app.put("/users", function (req, res) {
  if (req.isAuthenticated()) {
    User.updateOne(
      {
        username: req.body.username,
      },
      {
        firstName: _.capitalize(req.body.firstName),
        lastName: _.capitalize(req.body.lastName),
        role: "User",
        country: _.capitalize(req.body.country),
        phone: req.body.phone,
      },
      function (err) {
        if (!err) {
          res.send({ status: 200, response: "Updated User" });
        } else {
          res.send({ status: 404, response: err });
        }
      }
    );
  } else {
    res.send({ status: 401, response: "Unauthorize user" });
  }
});

app.delete("/users", function (req, res) {
  var userId = req.body.userId;
  if (req.isAuthenticated()) {
    User.findOneAndUpdate(
      {
        _id: req.user,
      },
      {
        $pull: {
          users: {
            _id: userId,
          },
        },
      },
      {
        useFindAndModify: false,
      },
      function (err, found) {
        if (err) {
          res.send({ status: 404, response: err });
        } else {
          res.send({ status: 200, response: "User deleted..." });
        }
      }
    );
  } else {
    res.send({ status: 401, response: "Unauthorize user" });
  }
});

// Projects ----------------------------------------------------------

app.get("/projects", function (req, res) {
  if (req.isAuthenticated()) {
    User.findById(req.user, function (err, users) {
      if (err) {
        res.send({ status: 404, response: err });
      } else {
        console.log(users);
        let projects = users.projects;
        res.send({ status: 200, data: projects });
      }
    });
  } else {
    res.send({ status: 401, response: "Unauthorize user" });
  }
});

app.post("/projects", function (req, res) {
  let project = {
    key:
      _.capitalize(req.body.name).replaceAll(" ", "-") +
      "-" +
      _.capitalize(req.body.company).replaceAll(" ", "-"),
    name: req.body.name,
    company: req.body.company,
    users: [],
    tasks: [],
  };

  if (req.isAuthenticated()) {
    User.findById(req.user, function (err, users) {
      if (err) {
        res.send({ status: 404, response: err });
      } else {
        let newProject = users.projects.find((i) => {
          return i.name == project.name && i.company == project.company;
        });
        // console.log(users);
        if (!newProject) {
          users.projects.push(project);
          users.save(function (err) {
            if (err) {
              console.log("err");
              res.send({ status: 504, response: err });
            } else {
              res.send({ status: 200, response: "Project has been added" });
            }
          });
        } else {
          res.send({
            status: 404,
            response: "Project can not be created because it exist",
          });
        }
      }
    });
  } else {
    res.send({ status: 401, response: "Unauthorize user" });
  }
});

app.post("/projects/user", function (req, res) {
  let projectId = req.body.projectId;
  let projectCompany = req.body.projectCompany;
  let projectUserId = req.body.projectUserId;

  if (req.isAuthenticated()) {
    User.findById({ _id: projectUserId }, function (err, user) {
      User.findOneAndUpdate(
        {
          _id: req.user,
          username: req.user.username,
          role: "Admin",
          // "projects.users": currentCourse.title,
          // "course.$[outer].modules.$[inner].lesson": currentLesson,
        },
        {
          $push: {
            "projects.$[first].users": user,
          },
        },
        {
          arrayFilters: [{ "first.company": projectCompany }],
        },
        function (err, found) {
          if (err) {
            res.send({ status: 404, response: err });
          } else {
            console.log("found");
            res.send({
              status: 200,
              response: "User has been added to project",
            });
          }
        }
      );
    });
  } else {
    res.send({ status: 401, response: "Unauthorize user" });
  }
});

app.delete("/projects/user", function (req, res) {
  let projectId = req.body.projectId;
  let projectCompany = req.body.projectCompany;
  let projectUserId = req.body.projectUserId;

  if (req.isAuthenticated()) {
    User.findById({ _id: projectUserId }, function (err, user) {
      User.findOneAndUpdate(
        {
          _id: req.user,
          username: req.user.username,
          role: "Admin",
        },
        {
          $pull: {
            "projects.$[first].users": user,
          },
        },
        {
          arrayFilters: [{ "first.company": projectCompany }],
        },
        function (err, found) {
          if (err) {
            res.send({ status: 404, response: err });
          } else {
            res.send({
              status: 200,
              response: "User has been delete from project",
            });
          }
        }
      );
    });
  } else {
    res.send({ status: 401, response: "Unauthorize user" });
  }
});

app.delete("/projects", function (req, res) {
  let projectkey = req.body.projectkey;

  if (req.isAuthenticated()) {
    User.findOneAndUpdate(
      {
        _id: req.user,
      },
      {
        $pull: {
          projects: {
            key: projectkey,
          },
        },
      },
      {
        useFindAndModify: false,
      },
      function (err, found) {
        if (err) {
          res.send({ status: 404, response: err });
        } else {
          res.send({ status: 200, response: "Project has been deleted" });
        }
      }
    );
  } else {
    res.send({ status: 401, response: "Unauthorize user" });
  }
});

app.post("/task", function (req, res) {
  let projectCompany = req.body.projectCompany;
  let task = {
    task: req.body.task,
    status: "Doing",
  };

  console.log(task);

  if (req.isAuthenticated()) {
    // User.findById({ _id: projectUserId }, function (err, user) {
    User.findOneAndUpdate(
      {
        _id: req.user,
        username: req.user.username,
        role: "Admin",
      },
      {
        $push: {
          "projects.$[first].tasks": task,
        },
        upsert: true,
      },
      {
        arrayFilters: [{ "first.company": projectCompany }],
      },
      function (err, found) {
        if (err) {
          res.send({ status: 404, response: err });
        } else {
          res.send({
            status: 200,
            response: "New Task has been added to project",
          });
        }
      }
    );
  } else {
    res.send({ status: 401, response: "Unauthorize user" });
  }
});

app.get("/project/task/", function (req, res) {
  let projectKey = req.query.key;

  if (req.isAuthenticated()) {
    User.findById(req.user, function (err, users) {
      if (err) {
        res.send({ status: 404, response: err });
      } else {
        // console.log(users.projects);
        let project = users.projects.filter((i) => i.key == projectKey);
        console.log(project);
        project.forEach((p) => {
          let tasks = p.tasks;

          res.send({ status: 200, data: tasks });
        });
      }
    });
  } else {
    res.send({ status: 401, response: "Unauthorize user" });
  }
});

app.post("/task/status", function (req, res) {
  let projectCompany = req.body.projectCompany;
  let status = req.body.status;
  let task = req.body.task;

  console.log(projectCompany, task, status);

  if (req.isAuthenticated()) {
    User.findOneAndUpdate(
      {
        _id: req.user,
        username: req.user.username,
        role: "Admin",
      },
      {
        $set: {
          "projects.$[first].tasks.$[second].status": status,
        },
        upsert: true,
      },
      {
        arrayFilters: [
          { "first.company": projectCompany },
          { "second.task": task },
        ],
      },
      function (err, found) {
        if (err) {
          res.send({ status: 404, response: err });
        } else {
          res.send({
            status: 200,
            response: "Updated Task Status to project",
          });
        }
      }
    );
  } else {
    res.send({ status: 401, response: "Unauthorize user" });
  }
});

// Delete Task

app.delete("/project/task", function (req, res) {
  // let projectkey = req.body.projectkey;
  let projectkey = req.body.projectkey;
  let task = { task: req.body.task, status: req.body.status };

  if (req.isAuthenticated()) {
    User.findOneAndUpdate(
      {
        _id: req.user,
        role: "Admin",
      },
      {
        $pull: {
          "projects.$[first].tasks": task,
        },
      },
      {
        arrayFilters: [{ "first.key": projectkey }],
      },
      function (err, found) {
        if (err) {
          res.send({ status: 404, response: err });
        } else {
          res.send({
            status: 200,
            response: "Task has been deleted",
          });
        }
      }
    );
  } else {
    res.send({ status: 401, response: "Unauthorize user" });
  }
});

let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}

app.listen(port, function () {
  console.log("server running at port " + port);
});
