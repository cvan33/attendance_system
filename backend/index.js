const express = require('express'); // import express, a web framework for Node.js without it, handling HTTP requests and responses would be a lot more complex.
const  {Pool}  = require('pg');     //import pg,pool manages connections to the database efficiently.Think of it like a pool of pipes to your database — you don’t open/close new connections every time.
const cors = require('cors');     // import cors for cross-origin requests, allowing frontend (which might be on a different domain or port) to communicate with this backend.
require('dotenv').config();     // load .env file variables into process.env, keeping sensitive info like DB credentials out of the codebase.

const app = express();     // create an express application
app.use(cors());                      // allow frontend requests,Enables CORS middleware → now React can talk to this backend.
app.use(express.json());              //parse JSON bodies means Allows backend to read JSON request bodies. Example: when frontend sends { "name": "Amit" },without this line Node wouldn’t understand it.


// Database connection
const pool = new Pool({                        //Creates a new PostgreSQL connection pool.
  connectionString: process.env.DATABASE_URL,  //Uses the DATABASE_URL from .env.
});                        //Instead of opening a new connection every time (which is slow),it reuses connections.

// Test DB connection
pool.connect()          // tries to connect to the database
  .then(client => {          //runs if connection works.
    console.log("!Database connected successfully!");
    client.release();      // release the client back to pool
  })
  .catch(err => console.error("Database connection error:", err.stack)); //prints error if connection fails

// Test route
app.get("/", (req, res) => {
  res.send("Attendance System Backend is running!");
});

/*app.get("/") → when someone visits / (homepage of backend), run this function.
req = request coming from client.
res = response you send back.
sends a plain message "Attendance System Backend is running ".
for confirming server is alive.*/

// Server start
const PORT = process.env.PORT || 5000;      //Reads PORT from .env file = 5000. If not found, defaults to 5000.
app.listen(PORT, () => {                    //Starts the server on the given port.
  console.log(`Server running on port ${PORT}`);  //prints in console → Server running on port=5000
});

/*steps
Import libraries
Setup middlewares
Connect PostgreSQL
Create a test route
Start the server
*/

// API for GET request // Fetch all students
app.get("/students", async (req, res) => {   // when hit /students in browser, this code run
  try {
    const result = await pool.query("SELECT * FROM students ORDER BY student_id ASC"); //awa
    res.json(result.rows); // send result back as JSON array/row
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database query failed" }); //If something breaks → returns 500 error
  }
});
/*
await
Database queries take time (Node.js sends the query → PostgreSQL processes → returns results).
Normally, Node.js would continue running other code immediately.
But with await, we tell Node.js:
“Pause here until PostgreSQL gives back the result.”
*/

// Fetch all attendance records
app.get("/attendance", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT a.attendance_id, s.name, s.roll_number, a.date, a.status
      FROM attendance a
      JOIN students s ON a.student_id = s.student_id
      ORDER BY a.date DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database query failed" });
  }
});


// API for (POST request) insert data
// Add a new student
app.post("/students", async (req, res) => {    //triggered when client sends POST request to /students.
  try {
    const { name, roll_number } = req.body; // get JSON data from request body or client // req.body = { "name": "Amit", "roll_number": "101
    const result = await pool.query(
      "INSERT INTO students (name, roll_number) VALUES ($1, $2) RETURNING *", //SQL uses parameterized query with $1, $2 → prevents SQL injection.
      [name, roll_number]
    );
    res.status(201).json(result.rows[0]); // return the inserted student
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to add student" });
  }
});

// Mark attendance
app.post("/attendance", async (req, res) => {
  try {
    const { student_id, date, status } = req.body;
    const result = await pool.query(
      "INSERT INTO attendance (student_id, date, status) VALUES ($1, $2, $3) RETURNING *",
      [student_id, date, status]
    );
    res.status(201).json(result.rows[0]); // return inserted record
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to mark attendance" });
  }
});

// Update student info
app.put("/students/:id", async (req, res) => {
  try {
    const { id } = req.params; // student id from URL
    const { name, roll_number } = req.body;
    const result = await pool.query(
      "UPDATE students SET name = $1, roll_number = $2 WHERE student_id = $3 RETURNING *",
      [name, roll_number, id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Student not found" });
    }
    res.json(result.rows[0]); // return updated student
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update student" });
  }
});

// Update attendance
app.put("/attendance/:id", async (req, res) => {
  try {
    const { id } = req.params; // attendance_id from URL
    const { status } = req.body;
    const result = await pool.query(
      "UPDATE attendance SET status = $1 WHERE attendance_id = $2 RETURNING *",
      [status, id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Attendance record not found" });
    }
    res.json(result.rows[0]); // return updated record
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update attendance" });
  }
});

//API for DELETE request
// Delete student
app.delete("/students/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "DELETE FROM students WHERE student_id = $1 RETURNING *",
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Student not found" });
    }

    res.json({ message: "Student deleted successfully", deleted: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete student" });
  }
});

// Delete attendance record
app.delete("/attendance/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "DELETE FROM attendance WHERE attendance_id = $1 RETURNING *",
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Attendance record not found" });
    }

    res.json({ message: "Attendance deleted successfully", deleted: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete attendance" });
  }
});
