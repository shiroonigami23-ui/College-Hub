// js/app.js - The Brain of College OS

// 1. IMPORT FIREBASE MODULES (Using CDN for easy setup without bundlers)
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
    where 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 2. CONFIGURATION (REPLACE WITH YOUR NEW KEYS)
const firebaseConfig = {
    apiKey: "AIzaSyBKSEoZyaLYRftuzfzn8H68SA6HM1qvOOk",
    authDomain: "attendance-app-92ed7.firebaseapp.com",
    projectId: "attendance-app-92ed7",
    storageBucket: "attendance-app-92ed7.firebasestorage.app",
    messagingSenderId: "496141456787",
    appId: "1:496141456787:web:6e50d366226f0624d7c466"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// 3. GLOBAL STATE
let currentUserData = null;
let cachedTimetable = null;

// ==========================================
// 4. AUTHENTICATION & SMART PARSING
// ==========================================

const loginOverlay = document.getElementById('loginOverlay');
const appContainer = document.getElementById('appContainer');
const loginBtn = document.getElementById('googleLoginBtn');
const loginError = document.getElementById('loginError');

// Smart Parser Logic
function parseStudentId(email) {
    // RJIT Pattern: 0902(College) + CS(Branch) + 23(Year) + ...
    const rawId = email.split('@')[0].toUpperCase();
    
    // Regex to extract Branch and Year
    const pattern = /^0902([A-Z]{2})(\d{2})/;
    const match = rawId.match(pattern);

    if (!match) return null; // Invalid ID format

    const branchCode = match[1]; // e.g., "CS"
    const admitYear = parseInt("20" + match[2]); // e.g., 2023
    
    // Calculate Semester dynamically
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1; // 1-12

    let yearDiff = currentYear - admitYear;
    let semester = 1;

    // Academic Year Logic: July-Dec = Odd Sem, Jan-June = Even Sem
    if (currentMonth >= 7) { 
        semester = (yearDiff * 2) + 1; 
    } else {
        semester = (yearDiff * 2); 
    }
    
    // Simple logic for Section: Even Roll Nos = A, Odd = B (Example logic)
    // You can customize this or fetch from DB if manual override exists
    const lastDigit = parseInt(rawId.slice(-1));
    const section = (lastDigit % 2 === 0) ? "A" : "B"; 

    return {
        enrollment: rawId,
        branch: branchCode,
        semester: `Semester ${semester}`, // Matches XML format "Fifth Semester" approximation
        section: section, // "A" or "B"
        year: admitYear
    };
}

// Login Handler
loginBtn.addEventListener('click', async () => {
    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        
        // Strict Domain Check
        if (!user.email.endsWith('@rjit.ac.in')) {
            throw new Error("Only @rjit.ac.in emails are allowed.");
        }

        const parsedInfo = parseStudentId(user.email);
        
        if (!parsedInfo) {
            throw new Error("Could not parse Enrollment ID from email.");
        }

        // Save/Update User in Firestore
        const userRef = doc(db, "users", user.uid);
        const userData = {
            uid: user.uid,
            name: user.displayName,
            email: user.email,
            photoURL: user.photoURL,
            lastLogin: serverTimestamp(),
            ...parsedInfo
        };

        await setDoc(userRef, userData, { merge: true });
        console.log("User synced to Firestore:", userData);

    } catch (error) {
        console.error(error);
        loginError.textContent = error.message;
        if (auth.currentUser) await signOut(auth);
    }
});

// Auth State Observer
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // User is signed in
        if (!user.email.endsWith('@rjit.ac.in')) {
            await signOut(auth);
            return;
        }

        loginOverlay.style.display = 'none';
        appContainer.style.display = 'flex';

        // Fetch full user profile
        const userSnap = await getDoc(doc(db, "users", user.uid));
        if (userSnap.exists()) {
            currentUserData = userSnap.data();
            initApp(currentUserData);
        }
    } else {
        // User is signed out
        loginOverlay.style.display = 'flex';
        appContainer.style.display = 'none';
    }
});

// Logout
document.getElementById('logoutBtn').addEventListener('click', () => {
    signOut(auth);
});

// ==========================================
// 5. INITIALIZATION & UI
// ==========================================

function initApp(user) {
    // 1. Update Header
    document.getElementById('headerUserName').textContent = user.name;
    document.getElementById('headerUserRole').textContent = `${user.branch} - ${user.semester} - Sec ${user.section}`;
    document.getElementById('headerUserInitials').textContent = user.name.charAt(0);

    // 2. Update Profile Section
    document.getElementById('profileName').value = user.name;
    document.getElementById('profileEmail').value = user.email;
    document.getElementById('profileBranch').value = user.branch;
    document.getElementById('profileEnrollment').value = user.enrollment;

    // 3. Load Data
    loadTimetableXML(user);
    setupRealtimeAssignments(user);
    setupNavigation();
}

// ==========================================
// 6. TIMETABLE LOGIC (XML PARSING)
// ==========================================

async function loadTimetableXML(user) {
    try {
        const response = await fetch('config.xml');
        const str = await response.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(str, "text/xml");

        // Find Section Node
        const sectionNode = xmlDoc.querySelector(`section[id="${user.section}"]`);
        if (!sectionNode) {
            console.error("Section not found in XML");
            return;
        }

        // Parse Subjects for Dropdowns
        const subjects = xmlDoc.querySelectorAll('subjects subject');
        const subjectList = [];
        const subjectSelect = document.getElementById('assSubject');
        subjectSelect.innerHTML = '';
        
        subjects.forEach(sub => {
            const name = sub.getAttribute('name');
            const code = sub.getAttribute('code');
            subjectList.push({ name, code });
            // Add to dropdown
            const opt = document.createElement('option');
            opt.value = code;
            opt.textContent = name;
            subjectSelect.appendChild(opt);
        });

        // Setup Chat Rooms based on Subjects
        setupChatRooms(subjectList);

        // Render Dashboard Timetable (Today)
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const todayName = days[new Date().getDay()];
        
        const todayNode = sectionNode.querySelector(`day[name="${todayName}"]`);
        const dashTbody = document.querySelector('#dashboardTimetable tbody');
        dashTbody.innerHTML = '';

        if (todayNode) {
            const slots = todayNode.querySelectorAll('slot');
            let nextClassFound = false;
            const now = new Date();
            const currentMinutes = now.getHours() * 60 + now.getMinutes();

            slots.forEach(slot => {
                const timeStr = slot.getAttribute('time'); // "09:10-10:00"
                const subjectCode = slot.getAttribute('subject');
                const room = slot.getAttribute('room');
                const type = slot.getAttribute('type');

                // Determine Subject Name
                const subObj = subjectList.find(s => s.code === subjectCode) || { name: subjectCode };

                // Render Row
                const row = `
                    <tr>
                        <td><strong>${timeStr}</strong></td>
                        <td>${subObj.name}</td>
                        <td>${room}</td>
                        <td><span class="tag">${type}</span></td>
                    </tr>
                `;
                dashTbody.innerHTML += row;

                // Next Class Logic
                if (!nextClassFound) {
                    const startTime = timeStr.split('-')[0]; // "09:10"
                    const [h, m] = startTime.split(':').map(Number);
                    const classMinutes = h * 60 + m;

                    if (classMinutes > currentMinutes) {
                        document.getElementById('dashNextClass').textContent = subObj.name;
                        document.getElementById('dashNextTime').textContent = `Starts at ${startTime}`;
                        nextClassFound = true;
                    }
                }
            });
        }

        if(dashTbody.innerHTML === '') {
            dashTbody.innerHTML = '<tr><td colspan="4">No classes today. Enjoy!</td></tr>';
            document.getElementById('dashNextClass').textContent = "No Classes";
        }

    } catch (err) {
        console.error("Error loading XML:", err);
    }
}

// ==========================================
// 7. ASSIGNMENTS (FIRESTORE)
// ==========================================

function setupRealtimeAssignments(user) {
    const q = query(
        collection(db, "assignments"), 
        where("section", "==", user.section) // Show assignments for this section
        // Add orderBy if needed
    );

    const kanbanBoard = document.getElementById('kanbanBoard');

    onSnapshot(q, (snapshot) => {
        let pendingCount = 0;
        kanbanBoard.innerHTML = ''; // Clear board

        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            pendingCount++;

            // Create Kanban Card
            const card = document.createElement('div');
            card.className = 'card-task';
            card.innerHTML = `
                <div class="task-title">${data.title}</div>
                <div class="task-meta">${data.subject} • Due: ${data.dueDate}</div>
                <div class="task-footer">
                   <span class="tag">Pending</span>
                </div>
            `;
            kanbanBoard.appendChild(card);
        });

        // Update Dashboard Counter
        document.getElementById('dashPendingVal').textContent = pendingCount;
    });
}

// Add Assignment Modal Logic
const modal = document.getElementById('assignmentModal');
document.getElementById('openAddAssignmentModal').addEventListener('click', () => modal.classList.add('active'));
document.getElementById('closeAssModal').addEventListener('click', () => modal.classList.remove('active'));

document.getElementById('addAssignmentForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('assTitle').value;
    const subject = document.getElementById('assSubject').value;
    const date = document.getElementById('assDate').value;

    try {
        await addDoc(collection(db, "assignments"), {
            title: title,
            subject: subject,
            dueDate: date,
            section: currentUserData.section, // Assign to current user's section
            createdBy: currentUserData.uid,
            createdAt: serverTimestamp(),
            status: 'pending'
        });
        modal.classList.remove('active');
        e.target.reset();
    } catch (err) {
        alert("Error creating assignment: " + err.message);
    }
});

// ==========================================
// 8. CHAT SYSTEM
// ==========================================

let currentChatUnsubscribe = null;

function setupChatRooms(subjects) {
    const roomList = document.getElementById('chatRoomList');
    roomList.innerHTML = '';

    subjects.forEach(sub => {
        const div = document.createElement('div');
        div.className = 'nav-item'; // Reuse nav-item style
        div.innerHTML = `<i data-lucide="hash"></i> <span>${sub.name}</span>`;
        div.style.marginBottom = '8px';
        div.onclick = () => openChatRoom(sub);
        roomList.appendChild(div);
    });
    lucide.createIcons();
}

function openChatRoom(subject) {
    const chatTitle = document.getElementById('currentChatRoomName');
    const messagesDiv = document.getElementById('chatMessages');
    
    chatTitle.textContent = `${subject.name} (Sec ${currentUserData.section})`;
    messagesDiv.innerHTML = ''; // Clear previous

    if (currentChatUnsubscribe) currentChatUnsubscribe();

    // Query messages for this subject AND section
    // Room ID format: "CS501_A" (SubjectCode_Section)
    const roomId = `${subject.code}_${currentUserData.section}`;
    
    const q = query(
        collection(db, "chat_messages"),
        where("roomId", "==", roomId),
        orderBy("createdAt", "asc")
    );

    currentChatUnsubscribe = onSnapshot(q, (snapshot) => {
        messagesDiv.innerHTML = ''; // Clear to prevent dupes (or append smartly in prod)
        snapshot.forEach(docSnap => {
            const msg = docSnap.data();
            const isMe = msg.uid === currentUserData.uid;
            
            const msgBubble = document.createElement('div');
            msgBubble.style.cssText = `
                background: ${isMe ? 'rgba(0, 212, 255, 0.2)' : 'rgba(255, 255, 255, 0.05)'};
                padding: 8px 12px;
                border-radius: 8px;
                margin-bottom: 8px;
                max-width: 80%;
                align-self: ${isMe ? 'flex-end' : 'flex-start'};
                border: 1px solid ${isMe ? 'var(--primary)' : 'var(--border)'};
                margin-left: ${isMe ? 'auto' : '0'};
            `;
            
            msgBubble.innerHTML = `
                <div style="font-size:10px; color:var(--text-secondary); margin-bottom:2px;">${msg.userName}</div>
                <div>${msg.text}</div>
            `;
            messagesDiv.appendChild(msgBubble);
        });
        
        // Auto scroll to bottom
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    });

    // Handle Send
    const chatForm = document.getElementById('chatForm');
    chatForm.onsubmit = async (e) => {
        e.preventDefault();
        const input = document.getElementById('chatInput');
        const text = input.value.trim();
        
        if (!text) return;

        await addDoc(collection(db, "chat_messages"), {
            roomId: roomId,
            text: text,
            uid: currentUserData.uid,
            userName: currentUserData.name,
            createdAt: serverTimestamp()
        });
        
        input.value = '';
    };
}

// ==========================================
// 9. NAVIGATION LOGIC
// ==========================================

function setupNavigation() {
    const navItems = document.querySelectorAll('.sidebar .nav-item[data-section]');
    const sections = document.querySelectorAll('.section');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            // Remove active class from all navs
            navItems.forEach(n => n.classList.remove('active'));
            // Add active to clicked
            item.classList.add('active');

            // Hide all sections
            sections.forEach(s => s.style.display = 'none');
            
            // Show target section
            const sectionId = item.getAttribute('data-section') + 'Section';
            const targetSection = document.getElementById(sectionId);
            if (targetSection) {
                targetSection.style.display = 'block';
            }
        });
    });
}


