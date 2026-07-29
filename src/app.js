const express = require("express");
const { engine } = require("express-handlebars");
const path = require("path");
const logger = require("morgan");
const cookieParser = require("cookie-parser");
const index = require("./routes/index");
const recent = require("./routes/recent");
const dce = require("./routes/dce");
const search = require("./routes/search");
const morgan = require("morgan");
const rfs = require("rotating-file-stream");

const app = express();

var accessLogStream = rfs.createStream("access.log", {
  interval: "7d",
  path: path.join(__dirname, "../log"),
});

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function tipHelper(text) {
  if (!text) {
    return "";
  }
  const escaped = escapeHtml(text);
  const html =
    `<span class="tip" tabindex="0" data-tooltip="${escaped}" data-position="bottom left" data-inverted="">` +
    `<i class="info circle icon" aria-hidden="true"></i>` +
    `</span>`;
  return {
    toHTML() {
      return html;
    },
  };
}

// view engine setup
app.engine(
  "handlebars",
  engine({
    defaultLayout: "main",
    helpers: {
      eq: (a, b) => a === b,
      selected: (a, b) => (a === b ? "selected" : ""),
      checked: (value) => (value ? "checked" : ""),
      tip: tipHelper,
    },
  }),
);
app.set("view engine", "handlebars");

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
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
app.use(function (err, req, res, _next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

module.exports = app;
