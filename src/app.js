const express = require("express");
const exphbs = require("express-handlebars");
const path = require("path");
const logger = require("morgan");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const index = require("./routes/index");
const recent = require("./routes/recent");
const dce = require("./routes/dce");
const search = require("./routes/search");
const fs = require("fs");
const morgan = require("morgan");
const rfs = require("rotating-file-stream"); // version 2.x

const app = express();

var accessLogStream = rfs.createStream("access.log", {
  interval: "7d",
  path: path.join(__dirname, "../log"),
});

// view engine setup
//app.set('views', path.join(__dirname, 'views')); TODO???
app.engine("handlebars", exphbs.engine({ defaultLayout: "main" }));
app.set("view engine", "handlebars");

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger("dev"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "../public")));
app.use(morgan("combined", { stream: accessLogStream }));

app.use("/", index);
app.use("/recent", recent);
app.use("/dce", dce);
app.use("/search", search);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  const err = new Error("Not Found");
  err.status = 404;
  next(err);
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

module.exports = app;
