// ===============================
// FILE: server.js
// ===============================
import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import multer from "multer";
import cors from "cors";
import connectDB, { mongoose } from "./database.js";

const app = express();
connectDB();

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));

// ================= MODELS =================
const OfficerSchema = new mongoose.Schema({
  matricule: String,
  password: String,
  grade: String,
  specialty: String,
  onDuty: { type: Boolean, default: false },
  dutyStart: Date,
  totalHours: { type: Number, default: 0 }
});

const CitizenSchema = new mongoose.Schema({
  name: String,
  photo: String
});

const RecordSchema = new mongoose.Schema({
  citizenId: mongoose.Schema.Types.ObjectId,
  crimes: [String],
  evidence: [String]
});

const ReportSchema = new mongoose.Schema({
  officerId: mongoose.Schema.Types.ObjectId,
  interventions: [String],
  content: String,
  createdAt: { type: Date, default: Date.now }
});

const InvestigationSchema = new mongoose.Schema({
  title: String,
  status: String,
  createdAt: { type: Date, default: Date.now }
});

const Officer = mongoose.models.Officer || mongoose.model("Officer", OfficerSchema);
const Citizen = mongoose.models.Citizen || mongoose.model("Citizen", CitizenSchema);
const Record = mongoose.models.Record || mongoose.model("Record", RecordSchema);
const Report = mongoose.models.Report || mongoose.model("Report", ReportSchema);
const Investigation = mongoose.models.Investigation || mongoose.model("Investigation", InvestigationSchema);

// ================= MIDDLEWARE =================
const auth = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "No token" });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: "Unauthorized" });
  }
};

// ================= MULTER =================
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (_, file, cb) => cb(null, Date.now() + "-" + file.originalname)
});

const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// ================= ROUTES =================
app.post("/api/auth/login", async (req, res) => {
  try {
    const { matricule, password } = req.body;
    const officer = await Officer.findOne({ matricule });
    if (!officer) return res.status(404).json({ error: "Not found" });

    const valid = await bcrypt.compare(password, officer.password);
    if (!valid) return res.status(401).json({ error: "Bad password" });

    const token = jwt.sign({ id: officer._id, grade: officer.grade }, process.env.JWT_SECRET, { expiresIn: "12h" });
    res.json({ token });
  } catch {
    res.status(500).json({ error: "Login failed" });
  }
});

app.get("/api/me", auth, async (req, res) => {
  const officer = await Officer.findById(req.user.id);
  res.json(officer);
});

// Admin create officer
app.post("/api/admin/create-officer", auth, async (req, res) => {
  if (req.user.grade !== "Etat-major") return res.sendStatus(403);
  const hash = await bcrypt.hash(req.body.password, 10);
  const officer = await Officer.create({ ...req.body, password: hash });
  res.json(officer);
});

// Toggle duty
app.post("/api/duty/toggle", auth, async (req, res) => {
  const officer = await Officer.findById(req.user.id);
  if (!officer.onDuty) {
    officer.onDuty = true;
    officer.dutyStart = new Date();
  } else {
    officer.onDuty = false;
    if (officer.dutyStart) {
      const diff = (Date.now() - officer.dutyStart) / 3600000;
      officer.totalHours += diff;
    }
  }
  await officer.save();
  res.json(officer);
});

// Citizens
app.get("/api/citizens", auth, async (_, res) => res.json(await Citizen.find()));

// Casier judiciaire
app.post("/api/casiers", auth, async (req, res) => {
  let citizen = await Citizen.findOne({ name: req.body.name });
  if (!citizen) citizen = await Citizen.create({ name: req.body.name });

  let record = await Record.findOne({ citizenId: citizen._id });
  if (!record) record = await Record.create({ citizenId: citizen._id, crimes: [] });

  record.crimes.push(req.body.crime);
  await record.save();
  res.json(record);
});

// Reports
app.post("/api/reports", auth, async (req, res) => {
  if (req.body.interventions?.length > 7) return res.status(400).json({ error: "Max 7 interventions" });
  const report = await Report.create({ officerId: req.user.id, ...req.body });
  res.json(report);
});

// Evidence upload
app.post("/api/evidence/upload", auth, upload.single("file"), async (req, res) => {
  res.json({ path: "/uploads/" + req.file.filename });
});

// Enquêtes
app.get("/api/enquetes", auth, async (req, res) => {
  const allowed = ["Detective", "Sergeant", "Etat-major"];
  if (!allowed.includes(req.user.grade)) return res.sendStatus(403);
  res.json(await Investigation.find());
});

// Health
app.get("/api/health", (_, res) => res.json({ status: "ok" }));

app.listen(3001, () => console.log("🚔 MDT Server running"));
