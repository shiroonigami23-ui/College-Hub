// js/app.js - The Brain of College OS

// ==========================================
// 1. IMPORTS & SETUP
// ==========================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getAuth, 
    GoogleAuthProvider, 
    signInWithPopup, 
    onAuthStateChanged, 
    signOut 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    getFirestore, 
    doc, 
    setDoc, 
    getDoc, 
    collection, 
    addDoc, 
    query, 
    orderBy, 
    onSnapshot,
    serverTimestamp,
    where,
    deleteDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// REPLACE WITH YOUR KEYS
const firebaseConfig = {
    apiKey: "FIREBASE_API_KEY_PLACEHOLDER",
    authDomain: "attendance-app-92ed7.firebaseapp.com",
    projectId: "attendance-app-92ed7",
    storageBucket: "attendance-app-92ed7.firebasestorage.app",
    messagingSenderId: "496141456787",
    appId: "1:496141456787:web:6e50d366226f0624d7c466"
};

// Initialize
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// Global State
let currentUser = null;
let subjectList = []; // Stores code, name, AND faculty
let semesterStartDate = null;
let timetableData = null; // Stores parsed timetable for attendance calc

// ==========================================
// 2. AUTHENTICATION & SMART PARSING
// ==========================================

const loginOverlay = document.getElementById('loginOverlay');
const appContainer = document.getElementById('appContainer');
const loginBtn = document.getElementById('googleLoginBtn');
const loginError = document.getElementById('loginError');

function parseStudentId(email) {
    const rawId = email.split('@')[0].toUpperCase();
    const pattern = /^0902([A-Z]{2})(\d{2})/;
    const match = rawId.match(pattern);

    if (!match) return null;

    const branchCode = match[1]; // CS
    const admitYear = parseInt("20" + match[2]); 
    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    
    let yearDiff = today.getFullYear() - admitYear;
    let semester = (currentMonth >= 7) ? (yearDiff * 2) + 1 : (yearDiff * 2);
    const lastDigit = parseInt(rawId.slice(-1));
    const section = (lastDigit % 2 === 0) ? "A" : "B"; 

    return {
        enrollment: rawId,
        branch: branchCode,
        semester: `Semester ${semester}`,
        section: section,
        year: admitYear
    };
}

loginBtn.addEventListener('click', async () => {
    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;

        if (!user.email.endsWith('@rjit.ac.in')) {
            throw new Error("Access Denied: Only @rjit.ac.in emails allowed.");
        }

        const parsedData = parseStudentId(user.email);
        if (!parsedData) throw new Error("Invalid Enrollment ID format.");

        await setDoc(doc(db, "users", user.uid), {
            uid: user.uid,
            name: user.displayName,
            email: user.email,
            photoURL: user.photoURL,
            lastLogin: serverTimestamp(),
            ...parsedData
        }, { merge: true });

    } catch (err) {
        console.error(err);
        loginError.textContent = err.message;
        await signOut(auth);
    }
});

onAuthStateChanged(auth, async (user) => {
    if (user && user.email.endsWith('@rjit.ac.in')) {
        loginOverlay.style.display = 'none';
        appContainer.style.display = 'flex';
        
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
            currentUser = snap.data();
            initApplication(currentUser);
        }
    } else {
        loginOverlay.style.display = 'flex';
        appContainer.style.display = 'none';
        currentUser = null;
    }
});

document.getElementById('logoutBtn').addEventListener('click', () => signOut(auth));

// ==========================================
// 3. INITIALIZATION
// ==========================================

function initApplication(user) {
    updateProfileUI(user);
    setupLocalAvatar(user.uid, user.name);
    loadConfigXML(user); // Loads Timetable & Faculty
    
    setupAssignments(user);
    setupNotes(user);
    setupExams(user);
    setupCommunity(user);
    setupFinance(user);
    setupSettings();
    setupNavigation();
}

function updateProfileUI(user) {
    document.getElementById('headerUserName').textContent = user.name;
    document.getElementById('headerUserRole').textContent = `${user.branch} - ${user.semester} - Sec ${user.section}`;
    
    document.getElementById('profileName').value = user.name;
    document.getElementById('profileEmail').value = user.email;
    document.getElementById('profileEnrollment').value = user.enrollment;
    document.getElementById('profileBranch').value = user.branch;
    document.getElementById('profileSemester').value = user.semester;
    document.getElementById('profileNameDisplay').textContent = user.name;
    document.getElementById('profileEmailDisplay').textContent = user.email;
}

// ==========================================
// 4. XML & TIMETABLE LOGIC (UPDATED)
// ==========================================
async function loadConfigXML(user) {
    try {
        const res = await fetch('config.xml');
        const text = await res.text();
        const parser = new DOMParser();
        const xml = parser.parseFromString(text, "text/xml");

        // 1. Parse Semester Start Date
        const startDateStr = xml.querySelector('semester-start')?.textContent;
        if (startDateStr) semesterStartDate = new Date(startDateStr);

        // 2. Parse Subjects & Faculty
        subjectList = [];
        xml.querySelectorAll('subjects subject').forEach(sub => {
            subjectList.push({
                code: sub.getAttribute('code'),
                name: sub.getAttribute('name'),
                faculty: sub.getAttribute('faculty') || 'N/A' // Capture Faculty
            });
        });
        
        populateDropdowns(subjectList);
        setupChatRooms(subjectList);

        // 3. Parse Timetable
        const sectionNode = xml.querySelector(`section[id="${user.section}"]`);
        if (sectionNode) {
            timetableData = sectionNode; // Store for attendance calc
            renderDashboardSchedule(sectionNode);
            renderFullTimetable(sectionNode);
            setupAttendance(user); // Init attendance after loading XML
        }

    } catch (err) {
        console.error("XML Error:", err);
    }
}

function populateDropdowns(list) {
    const assSelect = document.getElementById('assSubject');
    const noteSelect = document.getElementById('noteSubject');
    [assSelect, noteSelect].forEach(sel => {
        if (!sel) return;
        sel.innerHTML = '';
        list.forEach(sub => {
            const opt = document.createElement('option');
            opt.value = sub.code;
            opt.textContent = sub.name;
            sel.appendChild(opt);
        });
    });
}

function renderDashboardSchedule(sectionNode) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = days[new Date().getDay()];
    const todayNode = sectionNode.querySelector(`day[name="${today}"]`);
    const tbody = document.querySelector('#dashboardTimetable tbody');
    tbody.innerHTML = '';

    if (!todayNode) {
        tbody.innerHTML = '<tr><td colspan="5">No classes today.</td></tr>';
        document.getElementById('dashNextClass').textContent = "No Classes";
        return;
    }

    const slots = todayNode.querySelectorAll('slot');
    const now = new Date();
    const currMin = now.getHours() * 60 + now.getMinutes();
    let nextFound = false;

    slots.forEach(slot => {
        const time = slot.getAttribute('time');
        const code = slot.getAttribute('subject');
        const room = slot.getAttribute('room');
        const type = slot.getAttribute('type');
        
        // Find subject details
        const subData = subjectList.find(s => s.code === code) || { name: code, faculty: '-' };

        tbody.innerHTML += `
            <tr>
                <td><strong>${time}</strong></td>
                <td>${subData.name}</td>
                <td>${subData.faculty}</td>
                <td>${room}</td>
                <td><span class="tag">${type}</span></td>
            </tr>`;

        // Next Class Logic
        if (!nextFound) {
            const [start] = time.split('-');
            const [h, m] = start.split(':').map(Number);
            if ((h*60 + m) > currMin) {
                document.getElementById('dashNextClass').textContent = subData.name;
                document.getElementById('dashNextTime').textContent = start;
                nextFound = true;
            }
        }
    });
}

function renderFullTimetable(sectionNode) {
    const tbody = document.getElementById('fullTimetableBody');
    tbody.innerHTML = '';
    
    sectionNode.querySelectorAll('day').forEach(day => {
        const dayName = day.getAttribute('name');
        day.querySelectorAll('slot').forEach(slot => {
            const code = slot.getAttribute('subject');
            const subData = subjectList.find(s => s.code === code) || { name: code, faculty: '-' };
            
            tbody.innerHTML += `
                <tr>
                    <td><strong>${dayName} ${slot.getAttribute('time')}</strong></td>
                    <td>${subData.name}</td>
                    <td>${subData.faculty}</td> <td>${slot.getAttribute('room')}</td>
                    <td><span class="tag">${slot.getAttribute('type')}</span></td>
                </tr>
            `;
        });
    });
}

// ==========================================
// 5. SMART ATTENDANCE LOGIC
// ==========================================
async function setupAttendance(user) {
    const tbody = document.getElementById('attendanceBody');
    const totalDisplay = document.getElementById('dashAttendanceVal');
    
    // 1. Calculate Total Classes Held (Algorithm)
    const totalClassesHeld = calculateTotalClassesHeld();

    // 2. Fetch Student's Present Count from Firestore
    // Structure: users/{uid}/attendance = { "CS501": 12, "CS502": 10 }
    let studentAttendance = {};
    if (currentUser.attendance) {
        studentAttendance = currentUser.attendance;
    }

    let grandTotal = 0;
    let grandPresent = 0;

    tbody.innerHTML = '';
    
    // Iterate over calculated totals
    for (const [subjectCode, totalHeld] of Object.entries(totalClassesHeld)) {
        const present = studentAttendance[subjectCode] || 0;
        
        grandTotal += totalHeld;
        grandPresent += present;
        
        const perc = totalHeld === 0 ? 0 : ((present / totalHeld) * 100).toFixed(1);
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${subjectCode}</td>
            <td id="pres_${subjectCode}">${present}</td>
            <td>${totalHeld}</td>
            <td><span class="tag ${perc < 75 ? 'priority-high' : 'priority-low'}">${perc}%</span></td>
            <td>
                <button class="btn btn-primary btn-small" data-code="${subjectCode}">Mark +1</button>
            </td>
        `;
        
        // Mark Present Handler
        tr.querySelector('button').onclick = async () => {
            const newPresent = present + 1;
            // Optimistic Update
            document.getElementById(`pres_${subjectCode}`).innerText = newPresent;
            
            // Save to DB
            const userRef = doc(db, "users", user.uid);
            const updatePayload = {};
            updatePayload[`attendance.${subjectCode}`] = newPresent;
            await updateDoc(userRef, updatePayload).catch(e => {
                // If map doesn't exist, use setDoc with merge
                setDoc(userRef, { attendance: { [subjectCode]: newPresent } }, { merge: true });
            });
        };
        
        tbody.appendChild(tr);
    }

    const overall = grandTotal === 0 ? 0 : ((grandPresent / grandTotal) * 100).toFixed(1);
    totalDisplay.textContent = `${overall}%`;
}

function calculateTotalClassesHeld() {
    if (!timetableData || !semesterStartDate) return {};

    const totals = {};
    const now = new Date();
    const oneDay = 24 * 60 * 60 * 1000;
    
    // Map XML Day Names to JS getDay() integers
    const dayMap = { "Sunday":0, "Monday":1, "Tuesday":2, "Wednesday":3, "Thursday":4, "Friday":5, "Saturday":6 };

    // Iterate through every day from Semester Start until Today
    for (let d = new Date(semesterStartDate); d <= now; d.setDate(d.getDate() + 1)) {
        const dayIndex = d.getDay();
        // Find which day name matches this index
        const dayName = Object.keys(dayMap).find(key => dayMap[key] === dayIndex);
        
        // Look up this day in XML
        const dayNode = timetableData.querySelector(`day[name="${dayName}"]`);
        if (dayNode) {
            dayNode.querySelectorAll('slot').forEach(slot => {
                const code = slot.getAttribute('subject');
                if (!totals[code]) totals[code] = 0;
                totals[code]++;
            });
        }
    }
    return totals;
}

// ==========================================
// 6. ASSIGNMENTS & CHAT (EXISTING LOGIC)
// ==========================================
function setupAssignments(user) {
    const q = query(collection(db, "assignments"), where("section", "==", user.section));
    const board = document.getElementById('kanbanBoard');
    
    onSnapshot(q, (snap) => {
        board.innerHTML = '';
        let count = 0;
        snap.forEach(d => {
            const data = d.data();
            if(data.status !== 'done') count++;
            
            const card = document.createElement('div');
            card.className = 'card-task';
            card.innerHTML = `
                <div class="task-title">${data.title}</div>
                <div class="task-meta">${data.subject} • ${data.dueDate}</div>
                <div class="task-footer">
                    <span class="tag priority-${data.priority || 'medium'}">${data.priority || 'Normal'}</span>
                    <button class="btn btn-small btn-secondary" style="margin-left:auto;">Done</button>
                </div>
            `;
            card.querySelector('button').onclick = async () => {
                await deleteDoc(doc(db, "assignments", d.id));
            };
            board.appendChild(card);
        });
        document.getElementById('dashPendingVal').textContent = count;
    });

    setupModal('assignmentModal', 'openAddAssignmentModal', 'closeAssModal', 'cancelAssModal');
    
    document.getElementById('addAssignmentForm').onsubmit = async (e) => {
        e.preventDefault();
        await addDoc(collection(db, "assignments"), {
            title: document.getElementById('assTitle').value,
            subject: document.getElementById('assSubject').value,
            priority: document.getElementById('assPriority').value,
            dueDate: document.getElementById('assDate').value,
            section: user.section,
            status: 'pending',
            createdAt: serverTimestamp()
        });
        document.getElementById('assignmentModal').classList.remove('active');
        e.target.reset();
    };
}

// ... (Rest of Chat, Notes, Community, and Utils functions remain identical to previous complete version)
// Included below for complete file copy-paste convenience

function setupLocalAvatar(uid, name) {
    const key = `avatar_${uid}`;
    const headerAvatar = document.getElementById('headerUserAvatar');
    const profileAvatar = document.getElementById('profilePageAvatar');
    const uploadBtn = document.getElementById('uploadAvatarBtn');
    const fileInput = document.getElementById('avatarUpload');

    const stored = localStorage.getItem(key);
    if (stored) {
        applyAvatar(stored, headerAvatar, profileAvatar);
    } else {
        const init = name.split(' ').map(n=>n[0]).join('').substring(0,2);
        headerAvatar.textContent = init;
        profileAvatar.textContent = init;
    }

    uploadBtn.onclick = () => fileInput.click();
    fileInput.onchange = (e) => {
        const file = e.target.files[0];
        if(!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                localStorage.setItem(key, evt.target.result);
                applyAvatar(evt.target.result, headerAvatar, profileAvatar);
            } catch(e) { alert("Image too large!"); }
        };
        reader.readAsDataURL(file);
    };
}

function applyAvatar(base64, ...els) {
    els.forEach(el => {
        el.textContent = '';
        el.style.backgroundImage = `url(${base64})`;
        el.style.backgroundSize = 'cover';
        el.style.backgroundPosition = 'center';
    });
}

let chatUnsub = null;
function setupChatRooms(subjects) {
    const list = document.getElementById('chatRoomList');
    list.innerHTML = '';
    subjects.forEach(sub => {
        const div = document.createElement('div');
        div.className = 'nav-item';
        div.innerHTML = `<i data-lucide="hash"></i> <span>${sub.name}</span>`;
        div.onclick = () => loadChat(sub);
        div.style.marginBottom = '4px';
        list.appendChild(div);
    });
    lucide.createIcons();
}

function loadChat(subject) {
    const roomId = `${subject.code}_${currentUser.section}`;
    document.getElementById('currentChatRoomName').textContent = `${subject.name} (Sec ${currentUser.section})`;
    const msgBox = document.getElementById('chatMessages');
    msgBox.innerHTML = '';

    if (chatUnsub) chatUnsub();
    
    const q = query(collection(db, "chat_messages"), where("roomId", "==", roomId), orderBy("createdAt", "asc"));
    
    chatUnsub = onSnapshot(q, (snap) => {
        msgBox.innerHTML = '';
        snap.forEach(d => {
            const msg = d.data();
            const isMe = msg.uid === currentUser.uid;
            const bubble = document.createElement('div');
            bubble.style.cssText = `
                background: ${isMe ? 'rgba(0,212,255,0.2)' : 'rgba(255,255,255,0.05)'};
                padding: 8px 12px; border-radius: 8px; margin-bottom: 8px;
                max-width: 80%; align-self: ${isMe ? 'flex-end' : 'flex-start'};
                margin-left: ${isMe ? 'auto' : '0'};
            `;
            bubble.innerHTML = `<div style="font-size:10px; opacity:0.7;">${msg.sender}</div><div>${msg.text}</div>`;
            msgBox.appendChild(bubble);
        });
        msgBox.scrollTop = msgBox.scrollHeight;
    });

    document.getElementById('chatForm').onsubmit = async (e) => {
        e.preventDefault();
        const inp = document.getElementById('chatInput');
        const text = inp.value.trim();
        if(!text) return;
        
        await addDoc(collection(db, "chat_messages"), {
            roomId, text,
            sender: currentUser.name,
            uid: currentUser.uid,
            createdAt: serverTimestamp()
        });
        inp.value = '';
    };
}

function setupNotes(user) {
    const list = document.getElementById('notesList');
    const q = query(collection(db, "notes"), where("section", "==", user.section));
    onSnapshot(q, (snap) => {
        list.innerHTML = '';
        snap.forEach(d => {
            const n = d.data();
            list.innerHTML += `<div class="card" style="padding:16px; margin-bottom:12px;"><div style="font-weight:bold;">${n.title}</div><div style="font-size:12px; opacity:0.7;">${n.subject}</div><div>${n.content}</div></div>`;
        });
    });
    setupModal('addNoteModal', 'openAddNoteModal', 'closeNoteModal', 'cancelNoteModal');
    document.getElementById('addNoteForm').onsubmit = async (e) => {
        e.preventDefault();
        await addDoc(collection(db, "notes"), {
            title: e.target.querySelector('input').value,
            subject: document.getElementById('noteSubject').value,
            content: e.target.querySelector('textarea').value,
            section: user.section,
            uid: user.uid
        });
        document.getElementById('addNoteModal').classList.remove('active');
        e.target.reset();
    };
}

function setupExams(user) {
    const list = document.getElementById('examsList');
    const q = query(collection(db, "exams"), where("section", "==", user.section));
    onSnapshot(q, (snap) => {
        list.innerHTML = '';
        if(snap.empty) list.innerHTML = 'No exams.';
        snap.forEach(d => {
            const ex = d.data();
            list.innerHTML += `<div class="card" style="padding:16px; margin-bottom:12px;"><div style="font-weight:bold;">${ex.subject}</div><div>${ex.date} @ ${ex.time}</div></div>`;
        });
    });
    setupModal('addExamModal', 'openAddExamModal', 'closeExamModal', 'cancelExamModal');
    document.getElementById('addExamForm').onsubmit = async (e) => {
        e.preventDefault();
        const ins = e.target.querySelectorAll('input');
        await addDoc(collection(db, "exams"), { subject: ins[0].value, date: ins[1].value, time: ins[2].value, section: user.section });
        document.getElementById('addExamModal').classList.remove('active');
        e.target.reset();
    };
}

function setupCommunity(user) {
    const list = document.getElementById('communityThreads');
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    onSnapshot(q, (snap) => {
        list.innerHTML = '';
        snap.forEach(d => {
            const p = d.data();
            list.innerHTML += `<div class="card" style="padding:16px; margin-bottom:12px;"><div style="font-weight:600;">${p.title} <span class="tag">${p.category}</span></div><div>${p.message}</div><div style="font-size:11px; opacity:0.7;">By ${p.authorName}</div></div>`;
        });
    });
    setupModal('createPostModal', 'openCreatePostModal', 'closePostModal', 'cancelPostModal');
    document.getElementById('createPostForm').onsubmit = async (e) => {
        e.preventDefault();
        await addDoc(collection(db, "posts"), {
            title: e.target.querySelector('input').value,
            category: e.target.querySelector('select').value,
            message: e.target.querySelector('textarea').value,
            authorName: user.name,
            createdAt: serverTimestamp()
        });
        document.getElementById('createPostModal').classList.remove('active');
        e.target.reset();
    };
}

function setupFinance(user) {
    const list = document.getElementById('goalsList');
    const q = query(collection(db, "goals"), where("uid", "==", user.uid));
    onSnapshot(q, (snap) => {
        list.innerHTML = '';
        snap.forEach(d => {
            const g = d.data();
            list.innerHTML += `<div class="card" style="padding:16px; margin-bottom:12px;"><div>${g.title}</div><div>Target: ₹${g.amount} by ${g.deadline}</div></div>`;
        });
    });
    setupModal('addGoalModal', 'openAddGoalModal', 'closeGoalModal', 'cancelGoalModal');
    document.getElementById('addGoalForm').onsubmit = async (e) => {
        e.preventDefault();
        const ins = e.target.querySelectorAll('input');
        await addDoc(collection(db, "goals"), { title: ins[0].value, amount: ins[1].value, deadline: ins[2].value, uid: user.uid });
        document.getElementById('addGoalModal').classList.remove('active');
        e.target.reset();
    };
}

function setupSettings() {
    const toggle = document.getElementById('darkModeToggle');
    toggle.onchange = (e) => {
        if(!e.target.checked) document.documentElement.setAttribute('data-theme', 'light');
        else document.documentElement.removeAttribute('data-theme');
    };
}

function setupNavigation() {
    const navs = document.querySelectorAll('.sidebar .nav-item[data-section]');
    const sects = document.querySelectorAll('.section');
    navs.forEach(nav => {
        nav.addEventListener('click', () => {
            navs.forEach(n => n.classList.remove('active'));
            nav.classList.add('active');
            sects.forEach(s => s.style.display = 'none');
            const target = document.getElementById(`${nav.dataset.section}Section`);
            if(target) target.style.display = 'block';
            if(nav.dataset.section === 'analytics') renderCharts();
        });
    });
}

function setupModal(modalId, openBtnId, closeBtnId, cancelBtnId) {
    const modal = document.getElementById(modalId);
    if(openBtnId) document.getElementById(openBtnId).onclick = () => modal.classList.add('active');
    if(closeBtnId) document.getElementById(closeBtnId).onclick = () => modal.classList.remove('active');
    if(cancelBtnId) document.getElementById(cancelBtnId).onclick = () => modal.classList.remove('active');
}

function renderCharts() {
    const ctx = document.getElementById('performanceChart');
    if(window.myChart) window.myChart.destroy();
    window.myChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: subjectList.map(s => s.code),
            datasets: [{
                label: 'Attendance %',
                data: [85, 92, 78, 65, 90, 88, 75, 95], 
                backgroundColor: '#00d4ff'
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, max: 100 } } }
    });
}
