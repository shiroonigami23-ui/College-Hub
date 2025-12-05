// js/app.js - The Brain of College OS

// 1. IMPORT FIREBASE MODULES
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

// 2. CONFIGURATION (REPLACE THESE IF YOU REGENERATED KEYS)
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

// ==========================================
// 4. AUTHENTICATION & SMART PARSING
// ==========================================

const loginOverlay = document.getElementById('loginOverlay');
const appContainer = document.getElementById('appContainer');
const loginBtn = document.getElementById('googleLoginBtn');
const loginError = document.getElementById('loginError');

// Smart Parser Logic
function parseStudentId(email) {
    const rawId = email.split('@')[0].toUpperCase();
    const pattern = /^0902([A-Z]{2})(\d{2})/;
    const match = rawId.match(pattern);

    if (!match) return null; 

    const branchCode = match[1]; 
    const admitYear = parseInt("20" + match[2]); 
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1; 

    let yearDiff = currentYear - admitYear;
    let semester = (currentMonth >= 7) ? (yearDiff * 2) + 1 : (yearDiff * 2);
    
    // Logic for section: Even roll = A, Odd = B (Customizable)
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

// Login Handler
loginBtn.addEventListener('click', async () => {
    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        
        if (!user.email.endsWith('@rjit.ac.in')) {
            throw new Error("Only @rjit.ac.in emails are allowed.");
        }

        const parsedInfo = parseStudentId(user.email);
        
        if (!parsedInfo) {
            throw new Error("Could not parse Enrollment ID.");
        }

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

    } catch (error) {
        console.error(error);
        loginError.textContent = error.message;
        if (auth.currentUser) await signOut(auth);
    }
});

// Auth State Observer
onAuthStateChanged(auth, async (user) => {
    if (user) {
        if (!user.email.endsWith('@rjit.ac.in')) {
            await signOut(auth);
            return;
        }

        loginOverlay.style.display = 'none';
        appContainer.style.display = 'flex';

        const userSnap = await getDoc(doc(db, "users", user.uid));
        if (userSnap.exists()) {
            currentUserData = userSnap.data();
            initApp(currentUserData);
        }
    } else {
        loginOverlay.style.display = 'flex';
        appContainer.style.display = 'none';
    }
});

document.getElementById('logoutBtn').addEventListener('click', () => signOut(auth));

// ==========================================
// 5. INITIALIZATION & UI
// ==========================================

function initApp(user) {
    // 1. Update Header
    document.getElementById('headerUserName').textContent = user.name;
    document.getElementById('headerUserRole').textContent = `${user.branch} - ${user.semester} - Sec ${user.section}`;
    
    // 2. Update Profile Text
    document.getElementById('profileName').value = user.name;
    document.getElementById('profileEmail').value = user.email;
    document.getElementById('profileBranch').value = user.branch;
    document.getElementById('profileEnrollment').value = user.enrollment;
    document.getElementById('profileNameDisplay').textContent = user.name;

    // 3. Init Features
    loadTimetableXML(user);
    setupRealtimeAssignments(user);
    setupNavigation();
    
    // 4. Setup Local Avatar
    setupLocalAvatar(user.uid, user.name);
}

// ==========================================
// 6. LOCAL AVATAR LOGIC (New)
// ==========================================

function setupLocalAvatar(uid, name) {
    const avatarKey = `avatar_${uid}`;
    const headerAvatar = document.getElementById('headerUserAvatar');
    const profileAvatar = document.getElementById('profilePageAvatar');
    const uploadBtn = document.getElementById('uploadAvatarBtn');
    const fileInput = document.getElementById('avatarUpload');

    // 1. Check LocalStorage for existing image
    const storedImage = localStorage.getItem(avatarKey);
    
    if (storedImage) {
        applyAvatarImage(storedImage, headerAvatar, profileAvatar);
    } else {
        // Use Initials if no image
        const initials = name.split(' ').map(n => n[0]).join('').substring(0,2);
        headerAvatar.textContent = initials;
        headerAvatar.style.backgroundImage = 'none';
        profileAvatar.textContent = initials;
        profileAvatar.style.backgroundImage = 'none';
    }

    // 2. Handle Upload Button Click
    uploadBtn.onclick = () => fileInput.click();

    // 3. Handle File Selection
    fileInput.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(event) {
            const base64String = event.target.result;
            
            // Save to LocalStorage
            try {
                localStorage.setItem(avatarKey, base64String);
                applyAvatarImage(base64String, headerAvatar, profileAvatar);
                alert("Profile picture saved locally!");
            } catch (err) {
                alert("Image too large for local storage. Try a smaller image.");
            }
        };
        reader.readAsDataURL(file);
    };
}

function applyAvatarImage(base64, ...elements) {
    elements.forEach(el => {
        el.textContent = ''; // Remove initials
        el.style.backgroundImage = `url(${base64})`;
        el.style.backgroundSize = 'cover';
        el.style.backgroundPosition = 'center';
        el.style.color = 'transparent'; // Hide text color
    });
}

// ==========================================
// 7. TIMETABLE LOGIC
// ==========================================

async function loadTimetableXML(user) {
    try {
        const response = await fetch('config.xml');
        const str = await response.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(str, "text/xml");

        const sectionNode = xmlDoc.querySelector(`section[id="${user.section}"]`);
        if (!sectionNode) return;

        const subjects = xmlDoc.querySelectorAll('subjects subject');
        const subjectList = [];
        const subjectSelect = document.getElementById('assSubject');
        subjectSelect.innerHTML = '';
        
        subjects.forEach(sub => {
            const name = sub.getAttribute('name');
            const code = sub.getAttribute('code');
            subjectList.push({ name, code });
            const opt = document.createElement('option');
            opt.value = code;
            opt.textContent = name;
            subjectSelect.appendChild(opt);
        });

        setupChatRooms(subjectList);

        // Dashboard Schedule
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
                const timeStr = slot.getAttribute('time');
                const subjectCode = slot.getAttribute('subject');
                const room = slot.getAttribute('room');
                const type = slot.getAttribute('type');
                const subObj = subjectList.find(s => s.code === subjectCode) || { name: subjectCode };

                dashTbody.innerHTML += `<tr><td><strong>${timeStr}</strong></td><td>${subObj.name}</td><td>${room}</td><td><span class="tag">${type}</span></td></tr>`;

                if (!nextClassFound) {
                    const startTime = timeStr.split('-')[0];
                    const [h, m] = startTime.split(':').map(Number);
                    if ((h * 60 + m) > currentMinutes) {
                        document.getElementById('dashNextClass').textContent = subObj.name;
                        document.getElementById('dashNextTime').textContent = `Starts at ${startTime}`;
                        nextClassFound = true;
                    }
                }
            });
        }
        if(dashTbody.innerHTML === '') {
            dashTbody.innerHTML = '<tr><td colspan="4">No classes today.</td></tr>';
            document.getElementById('dashNextClass').textContent = "No Classes";
        }
    } catch (err) { console.error("Error loading XML:", err); }
}

// ==========================================
// 8. ASSIGNMENTS & CHAT
// ==========================================

function setupRealtimeAssignments(user) {
    const q = query(collection(db, "assignments"), where("section", "==", user.section));
    const kanbanBoard = document.getElementById('kanbanBoard');

    onSnapshot(q, (snapshot) => {
        let pendingCount = 0;
        kanbanBoard.innerHTML = '';
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            pendingCount++;
            const card = document.createElement('div');
            card.className = 'card-task';
            card.innerHTML = `<div class="task-title">${data.title}</div><div class="task-meta">${data.subject} • Due: ${data.dueDate}</div><div class="task-footer"><span class="tag">Pending</span></div>`;
            kanbanBoard.appendChild(card);
        });
        document.getElementById('dashPendingVal').textContent = pendingCount;
    });
}

const modal = document.getElementById('assignmentModal');
document.getElementById('openAddAssignmentModal').addEventListener('click', () => modal.classList.add('active'));
document.getElementById('closeAssModal').addEventListener('click', () => modal.classList.remove('active'));

document.getElementById('addAssignmentForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
        await addDoc(collection(db, "assignments"), {
            title: document.getElementById('assTitle').value,
            subject: document.getElementById('assSubject').value,
            dueDate: document.getElementById('assDate').value,
            section: currentUserData.section,
            createdBy: currentUserData.uid,
            createdAt: serverTimestamp(),
            status: 'pending'
        });
        modal.classList.remove('active');
        e.target.reset();
    } catch (err) { alert("Error: " + err.message); }
});

let currentChatUnsubscribe = null;
function setupChatRooms(subjects) {
    const roomList = document.getElementById('chatRoomList');
    roomList.innerHTML = '';
    subjects.forEach(sub => {
        const div = document.createElement('div');
        div.className = 'nav-item';
        div.innerHTML = `<i data-lucide="hash"></i> <span>${sub.name}</span>`;
        div.style.marginBottom = '8px';
        div.onclick = () => openChatRoom(sub);
        roomList.appendChild(div);
    });
    lucide.createIcons();
}

function openChatRoom(subject) {
    document.getElementById('currentChatRoomName').textContent = `${subject.name} (Sec ${currentUserData.section})`;
    const messagesDiv = document.getElementById('chatMessages');
    messagesDiv.innerHTML = '';
    if (currentChatUnsubscribe) currentChatUnsubscribe();

    const roomId = `${subject.code}_${currentUserData.section}`;
    const q = query(collection(db, "chat_messages"), where("roomId", "==", roomId), orderBy("createdAt", "asc"));

    currentChatUnsubscribe = onSnapshot(q, (snapshot) => {
        messagesDiv.innerHTML = '';
        snapshot.forEach(docSnap => {
            const msg = docSnap.data();
            const isMe = msg.uid === currentUserData.uid;
            const bubble = document.createElement('div');
            bubble.style.cssText = `background: ${isMe ? 'rgba(0, 212, 255, 0.2)' : 'rgba(255, 255, 255, 0.05)'}; padding: 8px 12px; border-radius: 8px; margin-bottom: 8px; max-width: 80%; align-self: ${isMe ? 'flex-end' : 'flex-start'}; margin-left: ${isMe ? 'auto' : '0'};`;
            bubble.innerHTML = `<div style="font-size:10px; color:var(--text-secondary); margin-bottom:2px;">${msg.userName}</div><div>${msg.text}</div>`;
            messagesDiv.appendChild(bubble);
        });
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    });

    document.getElementById('chatForm').onsubmit = async (e) => {
        e.preventDefault();
        const input = document.getElementById('chatInput');
        if (!input.value.trim()) return;
        await addDoc(collection(db, "chat_messages"), {
            roomId: roomId, text: input.value.trim(), uid: currentUserData.uid, userName: currentUserData.name, createdAt: serverTimestamp()
        });
        input.value = '';
    };
}

function setupNavigation() {
    const navItems = document.querySelectorAll('.sidebar .nav-item[data-section]');
    const sections = document.querySelectorAll('.section');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            navItems.forEach(n => n.classList.remove('active'));
            item.classList.add('active');
            sections.forEach(s => s.style.display = 'none');
            const target = document.getElementById(item.getAttribute('data-section') + 'Section');
            if (target) target.style.display = 'block';
        });
    });
}
