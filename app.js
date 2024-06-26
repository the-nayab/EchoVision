//Importing express and all other necessary modules
const express = require("express");
const app = express();
const path = require("path");
const ejsMate = require("ejs-mate");
const methodOverride = require("method-override");
const nodemailer = require("nodemailer");
const sgTransport = require("nodemailer-sendgrid-transport");
// Child process module for python
const { spawn } = require("child_process");
const fs = require('fs');


//Setting up the view engine and it's directory
app.engine("ejs", ejsMate);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

//All Express middleware/ Static files
app.use(express.json());
app.use(express.urlencoded({ extended: true })); //req.body is parsed as a form
app.use(methodOverride("_method")); //Setting the query for method-override
app.use(express.static(path.join(__dirname, "public"))); //It will serve our static files

// Creating global variable for src file of mp3

// Global variable to store audio src
var src = "";

// Index/Homepage Route
app.get("/", (req, res) => {
  res.locals.title = "home";
  res.render("home/home.ejs", { src: src });
});

// Create Route for sending audio Text to python
app.post("/", (req, res) => {
  // Getting information out of Request body
  var { url } = req.body.user;
  const userInformation = req.body.user;
  // Using spawn to call python script
  const childPython = spawn("python", [
    "visibility-project-python.py",
    JSON.stringify(userInformation),
  ]);
  //Execute the python script and fetch data
  childPython.stdout.on("data", (data) => {
    const doIt = data.toString();
    // Parsing JSON to JavaScript Object
    let pythonData = JSON.parse(data);
    // Destructing the object and creating variables
    let str = pythonData.str;
    src = pythonData.src;
    console.log(`total python data ${doIt}`);
    // console.log(`source printed by python ${src}`);
    // User if he wants to stop traversing
    // src = "stop";
    // Redirecting to the specified link
    if (str === "stop") {
      res.redirect(url);
    } else {
      res.redirect(str);
    }
  });
  childPython.stderr.on("data", (data) => {
    console.error(`stdError ${data}`);
  });
  childPython.on("close", (code) => {
    console.log(`child process exited with the code: ${code}`);
  });
});



// About Route
app.get("/about", (req, res) => {
  res.locals.title = "about";
  res.render("about/about.ejs", { src: src });
});

// How to Use Route
app.get("/howtouse", (req, res) => {
  res.locals.title = "howtouse";
  res.render("howtouse/howtouse.ejs", { src: src });
});

//More Routes
// motivation Route
app.get("/motivation", (req, res) => {
  const { id } = req.params;
  res.locals.title = "more";
  res.render("more/motivation.ejs", { id: id, src: src });
});

// benificiary Route
app.get("/beneficiary", (req, res) => {
  const { id } = req.params;
  res.locals.title = "more";
  res.render("more/beneficiary.ejs", { id: id, src: src });
});

// technology Route
app.get("/technologies", (req, res) => {
  const { id } = req.params;
  res.locals.title = "more";
  res.render("more/technology.ejs", { id: id, src: src });
});


// New route for Contact Us page
app.get('/feedback', (req, res) => {
  const { id } = req.params;
  res.locals.title = 'feedback';
  res.render('feedback/feedback.ejs', { id: id, src: src, formData: {} });
});

app.post('/feedback', (req, res) => {
  const { feedback } = req.body;
  const formData = { feedback };

  const transporter = nodemailer.createTransport(sgTransport({
    auth: {
      api_key: 'Your Sendgrid API_KEY'
    }
  }));

  const mailOptions = {
    from: 'fromsendgrid@gmail.com',
    to: 'to@gmail.com',
    subject: 'Feedback from Project Echo Vision',
    text: `Feedback: ${feedback}`
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error(`Error sending email: ${error}`);
      return res.status(500).render('feedback/feedback.ejs', { formData, error: 'Internal Server Error' });
    }
    console.log('Message sent:', info);
    res.redirect('/thankyou');
  });
});


app.use('/thankyou', (req, res, next) => {
  deleteSampleAudio();
  next();
});

// Function to delete the sample.mp3 file
function deleteSampleAudio() {
  const audioPath = 'public/audio/sample.mp3'; // Path to the sample audio file
  try {
    if (fs.existsSync(audioPath)) {
      fs.unlinkSync(audioPath);
      console.log('Sample audio file deleted successfully.');
    } else {
      console.log('Sample audio file does not exist.');
    }
  } catch (err) {
    console.error('Error deleting sample audio file:', err);
  }
}



// Route for thank you page
app.get('/thankyou', (req, res) => {
  const { id } = req.params;
  res.locals.title = 'Thank You';
  res.render('thankyou.ejs', { id: id, src: src });
});




//Starting up server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`You are listening at PORT: ${port}`);
});
