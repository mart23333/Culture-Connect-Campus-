require("dotenv").config();

const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const path = require("path");
const { db, initDb } = require("./db");

initDb();

const app = express();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "public")));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "secret",
    resave: false,
    saveUninitialized: false,
  })
);

function requireAuth(req, res, next) {
  if (!req.session.user) return res.redirect("/login");
  next();
}

app.get("/", (req, res) => {
  res.render("index", { user: req.session.user });
});

app.get("/signup", (req, res) => {
  res.render("signup", { user: req.session.user });
});

app.post("/signup", async (req, res) => {
  const { name, email, password } = req.body;

  const hash = await bcrypt.hash(password, 10);

  db.run(
    "INSERT INTO users(name,email,password_hash) VALUES(?,?,?)",
    [name, email, hash],
    function (err) {
      if (err) return res.send("Could not create account");
      req.session.user = { id: this.lastID, name, email };
      res.redirect("/events");
    }
  );
});

app.get("/login", (req, res) => {
  res.render("login", { user: req.session.user });
});

app.post("/login", (req, res) => {
  const { email, password } = req.body;

  db.get("SELECT * FROM users WHERE email = ?", [email], async (err, user) => {
    if (err || !user) return res.send("User not found");

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.send("Wrong password");

    req.session.user = { id: user.id, name: user.name, email: user.email };
    res.redirect("/events");
  });
});

app.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
});

// SEARCH EVENTS + SHOW CREATOR NAME
app.get("/events", requireAuth, (req, res) => {
  const q = (req.query.q || "").trim();

  if (q) {
    const like = `%${q}%`;

    db.all(
      `SELECT events.*, users.name AS creator_name
       FROM events
       JOIN users ON events.created_by = users.id
       WHERE events.title LIKE ?
          OR events.description LIKE ?
          OR events.location LIKE ?
          OR events.category LIKE ?
       ORDER BY events.start_time ASC`,
      [like, like, like, like],
      (err, events) => {
        if (err) return res.send("Database error");
        res.render("events", {
          events,
          user: req.session.user,
          q
        });
      }
    );
  } else {
    db.all(
      `SELECT events.*, users.name AS creator_name
       FROM events
       JOIN users ON events.created_by = users.id
       ORDER BY events.start_time ASC`,
      (err, events) => {
        if (err) return res.send("Database error");
        res.render("events", {
          events,
          user: req.session.user,
          q: ""
        });
      }
    );
  }
});

app.get("/events/new", requireAuth, (req, res) => {
  res.render("new-event", { user: req.session.user });
});

app.post("/events/new", requireAuth, (req, res) => {
  const { title, description, location, start_time, category } = req.body;

  db.run(
    "INSERT INTO events(title,description,location,start_time,category,created_by) VALUES(?,?,?,?,?,?)",
    [title, description, location, start_time, category, req.session.user.id],
    (err) => {
      if (err) return res.send("Could not create event");
      res.redirect("/events");
    }
  );
});

// EDIT EVENT
app.get("/events/:id/edit", requireAuth, (req, res) => {
  const eventId = req.params.id;

  db.get("SELECT * FROM events WHERE id = ?", [eventId], (err, event) => {
    if (err || !event) return res.send("Event not found");

    if (event.created_by !== req.session.user.id) {
      return res.send("You can only edit your own events");
    }

    res.render("edit-event", {
      event,
      user: req.session.user,
      error: null
    });
  });
});

app.post("/events/:id/edit", requireAuth, (req, res) => {
  const eventId = req.params.id;
  const { title, description, location, start_time, category } = req.body;

  db.get("SELECT * FROM events WHERE id = ?", [eventId], (err, event) => {
    if (err || !event) return res.send("Event not found");

    if (event.created_by !== req.session.user.id) {
      return res.send("You can only edit your own events");
    }

    db.run(
      `UPDATE events
       SET title = ?, description = ?, location = ?, start_time = ?, category = ?
       WHERE id = ?`,
      [title, description, location, start_time, category, eventId],
      (updateErr) => {
        if (updateErr) return res.send("Could not update event");
        res.redirect("/events");
      }
    );
  });
});

// DELETE EVENT
app.post("/events/:id/delete", requireAuth, (req, res) => {
  const eventId = req.params.id;

  db.get("SELECT * FROM events WHERE id = ?", [eventId], (err, event) => {
    if (err || !event) return res.send("Event not found");

    if (event.created_by !== req.session.user.id) {
      return res.send("You can only delete your own events");
    }

    db.run("DELETE FROM events WHERE id = ?", [eventId], (deleteErr) => {
      if (deleteErr) return res.send("Could not delete event");
      res.redirect("/events");
    });
  });
});

const PORT = process.env.PORT || 3000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

module.exports = app;