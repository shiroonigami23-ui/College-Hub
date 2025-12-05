# 🎓 College OS Pro v3.0 (College Hub)

![Version](https://img.shields.io/badge/version-3.0.0-blue.svg)
![Status](https://img.shields.io/badge/status-live-success.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

**College OS** is a comprehensive, centralized platform designed specifically for students of **RJIT**. It replaces scattered WhatsApp groups and static PDFs with a dynamic, interactive dashboard that manages attendance, timetables, assignments, and peer collaboration in real-time.

🔗 **Live Demo:** [https://shiroonigami23-ui.github.io/College-Hub/](https://shiroonigami23-ui.github.io/College-Hub/)

---

## ✨ Key Features

### 🔐 Security & Access
* **Domain-Locked Login:** Strictly restricted to official college email IDs (`@rjit.ac.in`).
* **Smart Identity Parsing:** Automatically extracts your **Branch**, **Semester**, **Year**, and **Section** directly from your enrollment ID/Email. No manual setup required!

### 📊 Academic Management
* **Dynamic Dashboard:** Real-time overview of attendance, pending tasks, and your next upcoming class.
* **Smart Timetable:** Loads your specific class schedule based on your section (A/B) from a central XML configuration.
* **Attendance Tracker:** Visualizes attendance percentages with "Safe/Danger" indicators and a calculator to predict how many classes you can skip.
* **Assignment Kanban Board:** Drag-and-drop style board (To-Do, In Progress, Done) for managing assignments.

### 🤝 Collaboration
* **Real-Time Chat Rooms:** specific chat rooms for every subject (e.g., CS501, CS502) to discuss doubts and share resources.
* **Community Forums:** Global threads for college-wide announcements and discussions.

### 🧠 Productivity Tools
* **Notes Hub:** Organized repository for subject-wise notes.
* **CGPA Calculator:** Estimate your Semester and Cumulative Grade Point Average.
* **Finance Tracker:** Track daily expenses and set savings goals.

### 🎨 UI/UX
* **Glassmorphism Design:** Modern, translucent aesthetic with blurred backgrounds.
* **Dark Mode:** Fully supported system-wide dark theme (default).
* **Responsive:** Works seamlessly on Desktop, Tablet, and Mobile.

---

## 🛠️ Technology Stack

* **Frontend:** HTML5, CSS3 (Custom Glassmorphism), JavaScript (ES6 Modules).
* **Backend / Database:** Firebase Firestore (NoSQL Real-time Database).
* **Authentication:** Firebase Authentication (Google Sign-In).
* **Configuration:** XML (for centralized Timetable & Syllabus management).
* **Icons:** Lucide Icons.

---

## 📂 Project Structure

```text
/College-Hub
│
├── index.html          # Main application entry point
├── config.xml          # Configuration file for Timetables & Subjects
│
├── css/
│   └── style.css       # Complete styling (Glassmorphism & Responsive)
│
└── js/
    └── app.js          # Core logic (Auth, Parsing, Firebase, Chat)
