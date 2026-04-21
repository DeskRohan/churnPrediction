const express = require("express");
const cors = require("cors");
const { exec } = require("child_process");
const nodemailer = require("nodemailer");

const app = express();
app.use(cors());
app.use(express.json());

app.post("/predict", (req, res) => {
  const input = JSON.stringify(req.body);

  // Escape double quotes for Windows CMD
  const escapedInput = input.replace(/"/g, '\\"');

  // Call Python script
  exec(`python ../ml/predict.py "${escapedInput}"`, (error, stdout, stderr) => {
    console.log("STDERR:", stderr);
    console.log("STDOUT:", stdout);
    if (error) {
      console.error(error);
      return res.status(500).send("Error running model");
    }

    try {
      // Find the first '{' in stdout to safely parse JSON if python printed any prior warnings
      const jsonStr = stdout.substring(stdout.indexOf('{'));
      const result = JSON.parse(jsonStr);
      res.json(result);
    } catch (err) {
      console.error("JSON PARSE ERROR", err);
      res.status(500).send("Invalid response from model");
    }
  });
});

app.get("/api/data", (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'data.json')));
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Data not available" });
  }
});

app.get("/api/sync", (req, res) => {
  const { exec } = require("child_process");
  exec("node convert.js", { cwd: __dirname }, (error, stdout, stderr) => {
    if (error) {
      console.error(error);
      return res.status(500).json({ error: "Script execution failed" });
    }
    try {
      const fs = require('fs');
      const path = require('path');
      const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'data.json')));
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: "Failed to read post-sync data" });
    }
  });
});

// ── REAL EMAIL DISPATCHER ── 
app.post("/api/send-email", async (req, res) => {
  const { to, subject, body } = req.body;

  // IMPORTANT: For Gmail, you MUST use an "App Password" (16 chars)
  // Get one here: https://myaccount.google.com/apppasswords
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "retaintionx@gmail.com",
      pass: "#RetaintionX01!"
    }
  });

  const mailOptions = {
    from: '"EcoRetain Retention" <retaintionx@gmail.com>',
    to: to,
    subject: subject,
    text: body
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent: " + info.response);
    res.json({ success: true, message: "Email Sent Real-Time!" });
  } catch (error) {
    console.error("Email Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(3000, () => {
  console.log("🚀 Server running on http://localhost:3000");
});