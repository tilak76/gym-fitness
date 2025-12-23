// ============================================
// MY GYM TRACKER - Main Javascript
// ============================================
//
// LIBRARIES USED:
// 1. Chart.js (https://www.chartjs.org/)
//    - Used to draw the 'Weight Progress' graph.
//    - It takes our data points and renders a smooth line chart on the <canvas>.
//
// 2. LocalStorage (Native Browser API)
//    - Used to save your data (workouts, weight, water) directly in your browser.
//    - This means you can refresh the page and your data is still here!
//
// NOTE: This uses regular, simple JavaScript. No complex frameworks.
// ============================================

// --- 1. DATA HANDLING ---
// We call localStorage to retrieve data. If it doesn't exist, we use defaults (empty arrays or 0).
let data = {
    workouts: JSON.parse(localStorage.getItem('mygym_workouts')) || [],
    weight: localStorage.getItem('mygym_weight') || '--',
    weightHistory: JSON.parse(localStorage.getItem('mygym_weight_history')) || [],
    water: parseInt(localStorage.getItem('mygym_water')) || 0,
    waterGoal: 8, // Daily goal of 8 cups
    plans: [], // Will hold our fetched plans
    user: JSON.parse(localStorage.getItem('mygym_user')) || null
};

// Global variable for the Chart instance so we can update it later
let chartInstance = null;
let currentCalendarDate = new Date(); // Track currently viewed month

// --- AUTH & PROFILE ---
// --- AUTHENTICATION ---
// ==========================================
// 1. UTILITIES (TOASTS)
// ==========================================

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return alert(message); // Fallback

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    // Icon based on type
    let icon = '<i class="fa-solid fa-circle-info" style="color:#3b82f6"></i>';
    if (type === 'success') icon = '<i class="fa-solid fa-circle-check" style="color:#22c55e"></i>';
    if (type === 'error') icon = '<i class="fa-solid fa-circle-exclamation" style="color:#ef4444"></i>';

    toast.innerHTML = `${icon} <span>${message}</span>`;

    container.appendChild(toast);

    // Remove after 3s
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ==========================================
// 2. AUTHENTICATION LOGIC
// ==========================================

function checkLogin() {
    const storedUser = localStorage.getItem('mygym_user');
    const loginPage = document.getElementById('login-page');
    const container = document.querySelector('.container');
    const sidebar = document.querySelector('.sidebar');

    if (storedUser) {
        // [LOGGED IN]
        try {
            data.user = JSON.parse(storedUser);
            if (loginPage) loginPage.style.display = 'none';
            if (container) container.style.display = 'block';
            if (sidebar) sidebar.style.display = 'block';
            updateProfileUI();
        } catch (e) {
            console.error("User Data Corrupt", e);
            logout();
        }
    } else {
        // [NOT LOGGED IN]
        if (loginPage) loginPage.style.display = 'flex';
        if (container) container.style.display = 'none';
        if (sidebar) sidebar.style.display = 'none';
    }
}

function attemptLogin() {
    const userIn = document.getElementById('login-user').value.trim();
    const passIn = document.getElementById('login-pass').value.trim();

    if (!userIn || !passIn) {
        showToast("Please enter both username and password.", "error");
        return;
    }

    const storedUser = JSON.parse(localStorage.getItem('mygym_user'));

    if (storedUser && storedUser.name === userIn && storedUser.password === passIn) {
        data.user = storedUser;
        checkLogin();
        showToast(`Welcome back, ${data.user.name}!`, "success");
    } else {
        showToast("Invalid Username or Password!", "error");
    }
}

function attemptSignup() {
    const userIn = document.getElementById('signup-user').value.trim();
    const passIn = document.getElementById('signup-pass').value.trim();
    const ageIn = document.getElementById('signup-age').value || 25;
    const genderIn = document.getElementById('signup-gender').value;
    const goalIn = document.getElementById('signup-goal').value;

    if (!userIn || !passIn) {
        showToast("Please choose a username and password.", "error");
        return;
    }

    const existing = localStorage.getItem('mygym_user');
    if (existing) {
        if (!confirm("A user profile already exists. Overwrite it?")) return;
    }

    const newUser = {
        name: userIn,
        password: passIn,
        age: ageIn,
        gender: genderIn,
        goal: goalIn,
        activity: 1.55,
        experience: 'Beginner',
        diet: 'Anything'
    };

    localStorage.setItem('mygym_user', JSON.stringify(newUser));
    data.user = newUser;
    checkLogin();
    showToast("Account Created Successfully!", "success");
}

function logout() {
    if (confirm("Are you sure you want to log out?")) {
        localStorage.removeItem('mygym_user');
        data.user = null;
        location.reload();
    }
}

// ==========================================
// 3. UI INTERACTIONS
// ==========================================

function toggleAuthMode(mode) {
    const loginForm = document.getElementById('auth-login');
    const signupForm = document.getElementById('auth-signup');

    if (mode === 'signup') {
        loginForm.style.display = 'none';
        signupForm.style.display = 'block';
    } else {
        loginForm.style.display = 'block';
        signupForm.style.display = 'none';
    }
}

function openProfileModal() {
    document.getElementById('profile-modal').style.display = 'flex';
}

function closeProfileModal() {
    document.getElementById('profile-modal').style.display = 'none';
}

function openToolsModal() {
    document.getElementById('tools-modal').style.display = 'flex';
}

function closeToolsModal() {
    document.getElementById('tools-modal').style.display = 'none';
}

function saveProfile() {
    try {
        if (!data.user) {
            data.user = { gender: 'Male', goal: 'loss' };
        }

        const nameEl = document.getElementById('p-name');
        if (nameEl) data.user.name = nameEl.value;

        const ageEl = document.getElementById('p-age');
        if (ageEl) data.user.age = ageEl.value;

        const genderEl = document.getElementById('p-gender');
        if (genderEl) data.user.gender = genderEl.value;

        const goalEl = document.getElementById('p-goal');
        if (goalEl) data.user.goal = goalEl.value;

        // New Fields
        const actEl = document.getElementById('p-activity');
        if (actEl) data.user.activity = actEl.value;

        const expEl = document.getElementById('p-experience');
        if (expEl) data.user.experience = expEl.value;

        const dietEl = document.getElementById('p-diet');
        if (dietEl) data.user.diet = dietEl.value;

        localStorage.setItem('mygym_user', JSON.stringify(data.user));

        renderDashboard();
        showToast("Profile Saved Successfully!", "success");
        closeProfileModal();

    } catch (e) {
        showToast("Error saving profile: " + e.message, "error");
        console.error(e);
    }
}

function updateProfileUI() {
    if (data.user && data.user.name) {
        const greetingEl = document.querySelector('.greeting');
        if (greetingEl) greetingEl.innerText = `Hello, ${data.user.name}`;

        const welcomeEl = document.getElementById('greeting-text');
        if (welcomeEl) welcomeEl.innerText = `Welcome Back, ${data.user.name}`;

        // Populate Modal
        const nameEl = document.getElementById('p-name');
        if (nameEl) nameEl.value = data.user.name;

        const ageEl = document.getElementById('p-age');
        if (ageEl) ageEl.value = data.user.age || '';

        const genderEl = document.getElementById('p-gender');
        if (genderEl) genderEl.value = data.user.gender;

        const goalEl = document.getElementById('p-goal');
        if (goalEl) goalEl.value = data.user.goal;
    }
}

// Placeholder for renderDashboard - assuming it will be defined elsewhere or is a new function
function renderDashboard() {
    // This function will orchestrate all dashboard UI updates
    renderPersonalPlan();
    // Other dashboard rendering functions would go here
}

function renderPersonalPlan() {
    // Only render if we have enough info
    if (!data.user || !data.user.activity) return;

    const user = data.user;
    const weight = parseFloat(data.weight) || 70;
    const height = 175;
    const age = parseInt(user.age) || 25;

    // 1. BMR Calculation (Mifflin-St Jeor)
    let bmr = 0;
    if (user.gender === 'Male') {
        bmr = 10 * weight + 6.25 * height - 5 * age + 5;
    } else {
        bmr = 10 * weight + 6.25 * height - 5 * age - 161;
    }

    // 2. TDEE
    const tdee = Math.round(bmr * parseFloat(user.activity));

    // 3. Adjust for Goal
    let targetCals = tdee;
    let proteinSplit = 0.3;
    let carbSplit = 0.4;
    let fatSplit = 0.3;

    if (user.goal === 'loss') {
        targetCals -= 500;
        proteinSplit = 0.4; carbSplit = 0.3; fatSplit = 0.3;
    } else if (user.goal === 'gain') {
        targetCals += 300;
        proteinSplit = 0.3; carbSplit = 0.45; fatSplit = 0.25;
    } else if (user.goal === 'endurance') {
        proteinSplit = 0.25; carbSplit = 0.55; fatSplit = 0.2;
    }

    // 4. Macro Values (g)
    const pG = Math.round((targetCals * proteinSplit) / 4);
    const cG = Math.round((targetCals * carbSplit) / 4);
    const fG = Math.round((targetCals * fatSplit) / 9);

    // 5. Workout Recommendation
    let workoutTitle = "Standard Full Body";
    let workoutDesc = "3 days/week. Focus on compound movements.";

    if (user.experience === 'Advanced') {
        workoutTitle = "5-Day Split";
        workoutDesc = "Push/Pull/Legs high volume split.";
    } else if (user.experience === 'Intermediate') {
        workoutTitle = "Upper/Lower Split";
        workoutDesc = "4 days/week. Balanced intensity.";
    }

    if (user.goal === 'endurance') {
        workoutTitle = "Hybrid Athlete";
        workoutDesc = "3x Strength, 3x Cardio/Run per week.";
    }

    // 6. UPDATE DASHBOARD UI
    const planDiv = document.getElementById('dashboard-plan');
    if (planDiv) {
        planDiv.style.display = 'block';
        document.getElementById('dash-cals').innerText = targetCals;
        document.getElementById('dash-macros').innerText = `P: ${pG}g • C: ${cG}g • F: ${fG}g`;
        document.getElementById('dash-workout-title').innerText = workoutTitle;
        document.getElementById('dash-workout-desc').innerText = workoutDesc;
    }
}

function updateUserUI() {
    // Update Sidebar
    const greet = document.querySelector('.greeting');
    if (greet && data.user) greet.innerText = `Hello, ${data.user.name}`;

    // Update Profile Page Inputs
    if (data.user) {
        // Document element removed
        const nameEl = document.getElementById('p-name');
        if (nameEl) nameEl.value = data.user.name;

        const ageEl = document.getElementById('p-age');
        if (ageEl) ageEl.value = data.user.age;

        const genderEl = document.getElementById('p-gender');
        if (genderEl) genderEl.value = data.user.gender;

        const goalEl = document.getElementById('p-goal');
        if (goalEl) goalEl.value = data.user.goal;

        // Populate new fields if they exist
        if (data.user.activity) {
            const actEl = document.getElementById('p-activity');
            if (actEl) actEl.value = data.user.activity;
        }
        if (data.user.experience) {
            const expEl = document.getElementById('p-experience');
            if (expEl) expEl.value = data.user.experience;
        }
        if (data.user.diet) {
            const dietEl = document.getElementById('p-diet');
            if (dietEl) dietEl.value = data.user.diet;
        }
    }
}

// --- MOCK DATABASE (Strategies & Guides) ---
const mockDB = {
    plans: [
        { id: 1, title: "Weight Loss Strategy", desc: "Low calorie, high protein meals.", level: "Strict", exercises: [101, 102, 103] },
        { id: 2, title: "Muscle Gain Feast", desc: "High surplus calories.", level: "High Calorie", exercises: [201, 202, 203] },
        { id: 3, title: "Balanced & Healthy", desc: "Maintain weight.", level: "Easy", exercises: [301, 302, 303] }
    ],
    exercises: {
        101: { name: "Oatmeal with Berries", muscle: "350 kcal | 15g Protein", difficulty: "Breakfast", steps: ["1/2 cup oats, 1 cup water/milk.", "Top with berries.", "Serve warm."] },
        102: { name: "Grilled Chicken Salad", muscle: "450 kcal | 40g Protein", difficulty: "Lunch", steps: ["Grilled Chicken Breast.", "Mixed greens.", "Olive oil dressing."] },
        103: { name: "Baked Salmon & Veggies", muscle: "500 kcal | 35g Protein", difficulty: "Dinner", steps: ["Season salmon.", "Roast with asparagus.", "Bake 20 mins."] }
    },
    strategies: {
        'loss': [
            { name: "Jump Squats", sets: "4", reps: "15", muscle: "Legs & Cardio", instructions: ["Stand feet shoulder-width.", "Lower into a squat.", "Explode up into a jump.", "Land softly and repeat."] },
            { name: "Push-ups", sets: "3", reps: "12", muscle: "Chest & Arms", instructions: ["Hands shoulder-width apart.", "Keep body in straight line.", "Lower chest to floor.", "Push back up."] },
            { name: "Mountain Climbers", sets: "3", reps: "30sec", muscle: "Core & Cardio", instructions: ["Plank position.", "Drive knees to chest alternately.", "Keep pace high.", "Don't raise hips."] },
            { name: "Burpees", sets: "3", reps: "10", muscle: "Full Body", instructions: ["Drop to squat.", "Kick feet back to plank.", "Do a pushup.", "Jump feet forward and explode up."] }
        ],
        'gain': [
            { name: "Barbell Squat", sets: "4", reps: "8", muscle: "Legs", instructions: ["Bar on traps.", "Feet shoulder-width.", "Squat depth below parallel.", "Drive up through heels."] },
            { name: "Bench Press", sets: "4", reps: "8-10", muscle: "Chest", instructions: ["Back flat on bench.", "Grip bar wide.", "Lower to mid-chest.", "Press up explosively."] },
            { name: "Deadlift", sets: "3", reps: "6", muscle: "Back & Legs", instructions: ["Feet hip-width.", "Grip bar outside legs.", "Keep back straight.", "Lift with legs and hips."] },
            { name: "Overhead Press", sets: "3", reps: "10", muscle: "Shoulders", instructions: ["Stand tall.", "Bar at collarbone.", "Press straight up.", "Lock out at top."] }
        ],
        'endurance': [
            { name: "5k Run / Jog", sets: "1", reps: "30 min", muscle: "Cardio", instructions: ["Maintain steady pace.", "Focus on breathing.", "Keep posture upright."] },
            { name: "Plank Hold", sets: "3", reps: "60sec", muscle: "Core", instructions: ["Elbows under shoulders.", "Body straight.", "Squeeze glutes and core.", "Hold."] },
            { name: "Lunges", sets: "3", reps: "20", muscle: "Legs", instructions: ["Step forward.", "Lower back knee to ground.", "Keep front knee behind toe.", "Push back to start."] }
        ],
        'maintain': [
            { name: "Goblet Squats", sets: "3", reps: "12", muscle: "Legs", instructions: ["Hold weight at chest.", "Squat down.", "Keep chest up.", "Drive up."] },
            { name: "Dumbbell Row", sets: "3", reps: "12", muscle: "Back", instructions: ["Hand on bench.", "Pull weight to hip.", "Squeeze back.", "Lower slowly."] },
            { name: "Push-ups", sets: "3", reps: "15", muscle: "Chest", instructions: ["Standard pushup form.", "Modify on knees if needed."] }
        ]
    }
};

function openExerciseGuide() {
    const modal = document.getElementById('guide-details-modal');
    const list = document.getElementById('guide-exercises-list');
    const title = document.getElementById('guide-modal-title');
    const user = data.user;

    // Determine Strategy Key
    let key = 'maintain';
    if (user.goal === 'loss') key = 'loss';
    else if (user.goal === 'gain') key = 'gain';
    else if (user.goal === 'endurance') key = 'endurance';

    const exercises = mockDB.strategies[key] || mockDB.strategies['maintain'];

    title.innerText = (user.goal.charAt(0).toUpperCase() + user.goal.slice(1)) + " Routine";
    list.innerHTML = "";

    exercises.forEach((ex, index) => {
        const item = document.createElement('div');
        item.style.cssText = "background:rgba(255,255,255,0.05); border-radius:10px; overflow:hidden;";
        item.innerHTML = `
            <div onclick="toggleInstruction(${index})" style="padding:15px; display:flex; justify-content:space-between; align-items:center; cursor:pointer;">
                <div>
                    <h4 style="margin:0; font-size:16px; color:#fff;">${ex.name}</h4>
                    <p style="margin:4px 0 0 0; font-size:12px; color:var(--text-muted);">${ex.sets} Sets &times; ${ex.reps} • ${ex.muscle}</p>
                </div>
                <i class="fa-solid fa-chevron-down" id="chevron-${index}" style="color:var(--text-muted); transition:transform 0.3s;"></i>
            </div>
            <div id="inst-${index}" style="display:none; padding:0 15px 15px 15px; border-top:1px solid rgba(255,255,255,0.05);">
                <p style="font-size:12px; color:var(--accent); font-weight:bold; margin:10px 0 5px 0;">HOW TO:</p>
                <ul style="margin:0; padding-left:20px; color:#cbd5e1; font-size:13px; line-height:1.6;">
                    ${ex.instructions.map(step => `<li>${step}</li>`).join('')}
                </ul>
            </div>
        `;
        list.appendChild(item);
    });

    modal.style.display = 'flex';
}

function toggleInstruction(index) {
    const content = document.getElementById(`inst-${index}`);
    const icon = document.getElementById(`chevron-${index}`);

    if (content.style.display === 'none') {
        content.style.display = 'block';
        icon.style.transform = 'rotate(180deg)';
        icon.style.color = 'var(--accent)';
    } else {
        content.style.display = 'none';
        icon.style.transform = 'rotate(0deg)';
        icon.style.color = 'var(--text-muted)';
    }
}

// --- DATA LOADING ---
// --- DATA LOADING ---
function loadPlans() {
    console.log("Loading Nutrition Plans...");

    // FALLBACK: Hardcode data to ensure it shows up regardless of DB errors
    data.plans = mockDB.plans;
    renderPlansUI();
}

function renderPlansUI() {
    const container = document.getElementById('plans-container');
    if (!container) return;
    container.innerHTML = '';

    data.plans.forEach(plan => {
        const card = document.createElement('div');
        card.className = 'plan-card';
        card.onclick = () => showPlanDetails(plan.id);

        card.innerHTML = `
            <span class="plan-badge">${plan.level}</span>
            <h2>${plan.title}</h2>
            <p>${plan.desc}</p>
            <p style="margin-top:10px; color:var(--primary); font-size:12px;">
                <i class="fa-solid fa-utensils"></i> ${plan.exercises.length} Meals/Day
            </p>
        `;
        container.appendChild(card);
    });
}

function showPlanDetails(planId) {
    const plan = data.plans.find(p => p.id === planId);
    if (!plan) return;

    // Switch views
    document.getElementById('plans-list-view').style.display = 'none';
    document.getElementById('plan-detail-view').style.display = 'block';

    // Populate Info
    const infoDiv = document.getElementById('plan-info');
    infoDiv.innerHTML = `
        <h2 style="color:var(--primary)">${plan.title}</h2>
        <p>${plan.desc}</p>
        <button onclick="selectPlan(${plan.id})" class="primary-btn" style="margin-top:15px; background:var(--accent);">
            Start This Diet
        </button>
    `;

    // Populate Exercises (Meals)
    const list = document.getElementById('plan-exercises-list');
    list.innerHTML = '';

    plan.exercises.forEach(exId => {
        const exData = mockDB.exercises[exId];
        const li = document.createElement('li');
        // Re-using history-style list items
        li.style.cursor = 'pointer';
        li.onclick = () => openExerciseModal(exId);
        li.innerHTML = `
             <div>
                <strong>${exData.name}</strong> <br>
                <small style="color:#94a3b8">${exData.difficulty}</small>
            </div>
            <span class="tag" style="background:#334155; font-size:12px;">View Recipe &rarr;</span>
        `;
        list.appendChild(li);
    });
}

function showPlansList() {
    document.getElementById('plans-list-view').style.display = 'block';
    document.getElementById('plan-detail-view').style.display = 'none';
}

function openExerciseModal(exId) {
    const ex = mockDB.exercises[exId];
    document.getElementById('modal-title').innerText = ex.name;
    document.getElementById('modal-muscle').innerText = ex.muscle; // Using this for Macros now
    document.getElementById('modal-difficulty').innerText = ex.difficulty; // Meal Time (Breakfast/etc)

    // Change "Instructions" label if possible, or just append data to steps
    // Since we can't change the HTML header easily without finding it, we'll just populate steps.
    const stepsList = document.getElementById('modal-steps');
    stepsList.innerHTML = '';

    ex.steps.forEach(step => {
        const li = document.createElement('li');
        li.innerText = step;
        li.style.marginBottom = '10px';
        stepsList.appendChild(li);
    });

    document.getElementById('exercise-modal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('exercise-modal').style.display = 'none';
}

// --- 2. INITIALIZATION ---
// This runs when the page loads.
function init() {
    // Check Auth First
    checkLogin();

    // Format Today's Date
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateDisplay = document.getElementById('date-display');
    if (dateDisplay) dateDisplay.innerText = new Date().toLocaleDateString('en-US', options);

    // Initial render
    renderDashboard();

    // Render Calendar
    renderCalendar();

    // Check for Absent Alert
    checkAbsence();

    // Load Plans Immediately
    loadPlans();

    console.log("App Initialized. Plans Data:", data.plans);
}

function checkAbsence() {
    // Sort workouts by date
    if (data.workouts.length === 0) return;

    const lastWorkout = new Date(data.workouts[data.workouts.length - 1].date);
    const today = new Date();

    // Calculate difference in time
    const diffTime = Math.abs(today - lastWorkout);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 3) {
        document.getElementById('absent-alert').style.display = 'flex';
        document.getElementById('days-absent').innerText = diffDays;
    }
}

// --- CALENDAR LOGIC ---
function changeMonth(dir) {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + dir);
    renderCalendar();
}

function renderCalendar() {
    const calendarGrid = document.getElementById('calendar-grid');
    if (!calendarGrid) return;

    calendarGrid.innerHTML = ''; // Clear

    // Use currentCalendarDate instead of 'now' for the view
    const viewYear = currentCalendarDate.getFullYear();
    const viewMonth = currentCalendarDate.getMonth();

    document.getElementById('month-name').innerText = currentCalendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    // Days in current month
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    // First day of month offset (0-6)
    const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay();

    // Today's actual date for highlighting
    const now = new Date();
    const isCurrentMonth = now.getMonth() === viewMonth && now.getFullYear() === viewYear;
    const todayDay = now.getDate();

    // Get all workout dates (formatted as YYYY-MM-DD for precise matching)
    // We filter workouts that match the viewYear and viewMonth
    const monthlyWorkouts = data.workouts.filter(w => {
        const d = new Date(w.date);
        return d.getMonth() === viewMonth && d.getFullYear() === viewYear;
    });

    // Map of Day -> Workout Array
    const workoutMap = {};
    monthlyWorkouts.forEach(w => {
        const day = new Date(w.date).getDate();
        if (!workoutMap[day]) workoutMap[day] = [];
        workoutMap[day].push(w);
    });

    // Empty slots for start of month
    for (let i = 0; i < firstDayIndex; i++) {
        const empty = document.createElement('div');
        calendarGrid.appendChild(empty);
    }

    for (let i = 1; i <= daysInMonth; i++) {
        const dayDiv = document.createElement('div');
        dayDiv.className = 'calendar-day';
        dayDiv.innerText = i;

        // 1. Is it today?
        if (isCurrentMonth && i === todayDay) dayDiv.classList.add('today');

        // 2. Did we workout?
        if (workoutMap[i]) {
            dayDiv.classList.add('active'); // Green
            dayDiv.style.cursor = 'pointer';
            dayDiv.onclick = () => showDailySummary(i, workoutMap[i]);

            // Optional: Add indicator dot
            const dot = document.createElement('div');
            dot.style.cssText = "width:4px; height:4px; background:#fff; border-radius:50%; margin-top:2px;";
            // dayDiv.appendChild(dot); // Keeps it clean without dot for now
        }
        // 3. Absent Logic (Past days in current month, or past months)
        else {
            // Check if this specific day is in the past globally
            const checkDate = new Date(viewYear, viewMonth, i);
            checkDate.setHours(23, 59, 59);

            if (checkDate < now) {
                dayDiv.classList.add('absent'); // Red
            }
        }

        calendarGrid.appendChild(dayDiv);
    }
}

function showDailySummary(day, workouts) {
    let msg = `Workouts on ${currentCalendarDate.toLocaleString('default', { month: 'long' })} ${day}:\n\n`;
    workouts.forEach(w => {
        msg += `• ${w.name} (${w.sets}x${w.reps})\n`;
    });
    alert(msg);
}

// --- 3. RENDERING (Updating the Screen) ---
function renderDashboard() {
    // A. Update the Top Stats Boxes
    document.getElementById('total-workouts').innerText = data.workouts.length;
    document.getElementById('current-weight').innerText = data.weight;
    document.getElementById('water-count').innerText = data.water;

    // B. Draw the Chart (using Chart.js library)
    renderChart();

    // C. Render Personal Plan (New Guide)
    renderPersonalPlan();

    // D. Re-render calendar to reflect changes
    renderCalendar();

    // E. Update the Recent History List
    const list = document.getElementById('history-list');
    list.innerHTML = ''; // Clear current list

    // Get the last 5 workouts (reverse to show newest first)
    const recent = data.workouts.slice().reverse().slice(0, 5);

    if (recent.length === 0) {
        list.innerHTML = '<li class="empty-msg">No workouts yet. Go log one!</li>';
    } else {
        recent.forEach((w, index) => {
            // 1. Icon & Color Logic
            let iconClass = 'fa-dumbbell';
            let colorVar = 'var(--primary)';

            if (w.type === 'Cardio') {
                iconClass = 'fa-person-running';
                colorVar = 'var(--accent)';
            } else if (w.type === 'Flexibility') {
                iconClass = 'fa-child-reaching';
                colorVar = '#f59e0b';
            }

            // 2. Format Date (e.g., "Mon 12")
            const dateObj = new Date(w.date);
            const dateStr = dateObj.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });

            // Calculate actual index in data.workouts array (reversed view)
            const actualIndex = data.workouts.length - 1 - index;

            // 3. Create List Item
            const li = document.createElement('li');
            li.innerHTML = `
                <div class="hist-icon" style="background: color-mix(in srgb, ${colorVar} 20%, transparent); color: ${colorVar};">
                    <i class="fa-solid ${iconClass}"></i>
                </div>
                <div class="hist-info">
                    <h4 style="margin:0; font-size:16px; color:var(--text);">${w.name}</h4>
                    <p style="margin:4px 0 0 0; font-size:12px; color:var(--text-muted);">
                        ${w.sets} Sets &times; ${w.reps} Reps &bull; <span style="color:${colorVar}">${w.weight}kg</span>
                    </p>
                </div>
                <div class="hist-meta" style="text-align:right; display:flex; flex-direction:column; align-items:flex-end; gap:5px;">
                    <span style="display:block; font-size:12px; font-weight:bold; color:var(--text-muted);">${dateStr}</span>
                    <span class="tag-outline" style="border:1px solid ${colorVar}; color:${colorVar}; font-size:10px; padding:2px 8px; border-radius:10px;">${w.type}</span>
                    <button onclick="deleteWorkout(${actualIndex})" title="Cancel Workout" style="background:none; border:none; color:#ef4444; font-size:14px; cursor:pointer; padding:2px; margin-top:2px; opacity:0.7; transition:opacity 0.2s;" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0.7">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>
            `;
            list.appendChild(li);
        });
    }
}

// --- CUSTOM CONFIRM MODAL ---
let confirmCallback = null;

function showConfirm(actionCallback) {
    confirmCallback = actionCallback;
    document.getElementById('confirm-modal').style.display = 'flex';
}

function closeConfirmModal(confirmed) {
    document.getElementById('confirm-modal').style.display = 'none';
    if (confirmed && confirmCallback) {
        confirmCallback();
    }
    if (!confirmed) confirmCallback = null;
}

function deleteWorkout(index) {
    showConfirm(() => {
        data.workouts.splice(index, 1);
        localStorage.setItem('mygym_workouts', JSON.stringify(data.workouts));
        renderDashboard();
    });
}

// --- 4. NAVIGATION (Switching Pages) ---
// Simple Single Page Application entry point
function showPage(pageId) {
    // 1. Hide all pages
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('nav li').forEach(l => l.classList.remove('active-link'));

    // 2. Show the selected page
    document.getElementById(pageId).classList.add('active');

    const navItem = document.getElementById('nav-' + pageId);
    if (navItem) navItem.classList.add('active-link');

    // 3. Update Header Title
    const titles = {
        'dashboard': 'Dashboard',
        'log': 'Log Workout',
        'tools': 'Tools',
        'profile': 'My Profile'
    };
    const headerTitle = document.getElementById('page-title');
    if (headerTitle) headerTitle.innerText = titles[pageId] || 'FitTrack';

    // 4. Refresh dashboard if we clicked 'Dashboard'
    if (pageId === 'dashboard') renderDashboard();
}

// --- 4. SIDEBAR TOGGLE ---
// --- 4. SIDEBAR TOGGLE (DRAWER MODE) ---
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const container = document.querySelector('.container');
    const btn = document.getElementById('menu-btn');

    // Toggle Hidden State
    sidebar.classList.toggle('sidebar-hidden');
    sidebar.classList.toggle('mobile-open'); // Fix for mobile
    container.classList.toggle('full-width');

    // Update Button Position
    if (btn) btn.classList.toggle('closed');
}

// --- 5. LOGGING WORKOUTS ---
// --- 5. LOGGING WORKOUTS ---
// Modal Controls
function openLogModal() {
    document.getElementById('log-modal').style.display = 'flex';
}

function closeLogModal() {
    document.getElementById('log-modal').style.display = 'none';
}

function closeFeedbackModal() {
    document.getElementById('feedback-modal').style.display = 'none';
}

// SMART FEEDBACK LOGIC
function generateFeedback(workout) {
    const analysisEl = document.getElementById('fb-analysis');
    const tipEl = document.getElementById('fb-tip');

    // 1. Calculate Volume/Intensity logic
    const weight = parseInt(workout.weight) || 0;
    const reps = parseInt(workout.reps) || 0;
    const sets = parseInt(workout.sets) || 0;
    const volume = weight * reps * sets;

    let analysisText = "";
    if (workout.type === 'Strength') {
        if (volume > 500) {
            analysisText = `Huge volume! You moved a total of <strong>${volume}kg</strong>. Your muscles are definitely activated.`;
        } else if (weight > 50) {
            analysisText = `Great intensity! Lifting <strong>${weight}kg</strong> is solid. Focus on form.`;
        } else {
            analysisText = `Good form focus. You did <strong>${sets} sets</strong>. Consistency is key!`;
        }
    } else if (workout.type === 'Cardio') {
        analysisText = `Heart health boosted! ${workout.duration} mins of cardio burns significant calories.`;
    } else {
        analysisText = `Flexibility is crucial for longevity. Great job taking care of your joints.`;
    }

    // 2. Nutrition/Recovery Advice
    let tipText = "";
    if (workout.type === 'Strength') {
        tipText = "💪 <strong>Nutrition:</strong> Consume 20-30g of protein within 30 mins to repair muscle fibers.";
    } else if (workout.type === 'Cardio') {
        tipText = "💧 <strong>Hydration:</strong> Drink 500ml of water now. Electrolytes help if you sweated a lot.";
    } else {
        tipText = "🧘 <strong>Recovery:</strong> Doing this before bed ensures better sleep quality.";
    }

    analysisEl.innerHTML = analysisText;
    tipEl.innerHTML = tipText;

    // Show Modal
    document.getElementById('feedback-modal').style.display = 'flex';
}

// Listen for the "Save Workout" button click
document.getElementById('workout-form').addEventListener('submit', function (e) {
    e.preventDefault(); // Stop page from reloading

    // Create a workout object from form inputs
    const workout = {
        name: document.getElementById('ex-name').value,
        type: document.getElementById('ex-type').value,
        sets: document.getElementById('ex-sets').value || '-',
        reps: document.getElementById('ex-reps').value || '-',
        weight: document.getElementById('ex-weight').value || 0,
        duration: document.getElementById('ex-duration').value || 0,
        date: new Date().toISOString()
    };

    // Save to our data array
    data.workouts.push(workout);

    // Persist to LocalStorage
    localStorage.setItem('mygym_workouts', JSON.stringify(data.workouts));

    // Reset Form & Close Log Modal
    this.reset();
    closeLogModal();

    // TRIGGER SMART FEEDBACK (instead of alert)
    // Small delay to feel like "Processing"
    setTimeout(() => {
        generateFeedback(workout);
    }, 300);

    renderDashboard(); // Update screen logic
});

// --- 6. WATER TRACKING ---
function addWater() {
    data.water++;
    saveWater();
}

function resetWater() {
    data.water = 0;
    saveWater();
}

function saveWater() {
    localStorage.setItem('mygym_water', data.water);
    renderDashboard(); // Update screen
}

// --- 7. WEIGHT & CHARTING ---
function saveWeight() {
    const w = document.getElementById('my-weight').value;
    if (w) {
        data.weight = w;

        // Add entry to history for the chart
        const entry = { date: new Date().toLocaleDateString(), weight: w };
        data.weightHistory.push(entry);

        // Save everything
        localStorage.setItem('mygym_weight', w);
        localStorage.setItem('mygym_weight_history', JSON.stringify(data.weightHistory));

        alert('Weight updated successfully!');
        renderDashboard();
        closeProfileModal();
    } else {
        alert('Please enter a weight.');
    }
}


// FUNCTION: Render Chart using Chart.js
function renderChart() {
    const ctx = document.getElementById('weightChart').getContext('2d');

    // If a chart already exists, destroy it so we don't draw over it
    if (chartInstance) chartInstance.destroy();

    // Prepare data for the library
    const labels = data.weightHistory.map(e => e.date);
    const values = data.weightHistory.map(e => e.weight);

    // Check if Chart library is loaded (CDN might fail offline)
    if (typeof Chart === 'undefined') {
        console.warn("Chart.js not loaded.");
        const failMsg = document.createElement('p');
        failMsg.innerText = "Chart unavailable (offline)";
        failMsg.style.color = "#555";
        failMsg.style.textAlign = "center";
        failMsg.style.padding = "20px";

        ctx.canvas.parentNode.innerHTML = "";
        document.getElementById('weightChart').parentNode.appendChild(failMsg);
        return;
    }

    // Create new Chart
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(34, 197, 94, 0.5)');
    gradient.addColorStop(1, 'rgba(34, 197, 94, 0.0)');

    // Calculate Stats
    if (values.length > 0) {
        const startW = parseFloat(values[0]);
        const currW = parseFloat(values[values.length - 1]);
        const change = (currW - startW).toFixed(1);

        document.getElementById('stat-current').innerText = currW + ' kg';
        document.getElementById('stat-start').innerText = startW + ' kg';

        const changeEl = document.getElementById('stat-change');
        changeEl.innerText = (change > 0 ? '+' : '') + change + ' kg';
        changeEl.style.color = change < 0 ? '#22c55e' : (change > 0 ? '#ef4444' : '#fff');
    }

    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Weight',
                data: values,
                borderColor: '#22c55e',
                backgroundColor: gradient,
                borderWidth: 3,
                pointBackgroundColor: '#fff',
                pointBorderColor: '#22c55e',
                pointRadius: 4,
                pointHoverRadius: 6,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    display: true,
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#94a3b8' }
                },
                x: {
                    display: true,
                    grid: { display: false },
                    ticks: { color: '#94a3b8' }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: '#334155',
                    borderWidth: 1,
                    padding: 10,
                    displayColors: false
                }
            }
        }
    });
}

// --- 8. TOOLS (Calculators) ---
function calcBMI() {
    const h = parseFloat(document.getElementById('bmi-h').value);
    const w = parseFloat(document.getElementById('bmi-w').value);

    if (h && w) {
        // Formula: weight / (height_in_meters)^2
        const bmi = (w / ((h / 100) ** 2)).toFixed(1);
        const resEnv = document.getElementById('bmi-res');
        resEnv.style.display = 'block';
        resEnv.innerText = `Your BMI: ${bmi}`;
    } else {
        alert('Please enter height and weight');
    }
}

function calcBMR() {
    const w = parseFloat(document.getElementById('bmr-w').value)
    const h = parseFloat(document.getElementById('bmr-h').value);
    const a = parseFloat(document.getElementById('bmr-a').value);
    const g = document.getElementById('bmr-g').value;

    if (w && h && a) {
        // Mifflin-St Jeor Equation
        let bmr = (10 * w) + (6.25 * h) - (5 * a);
        if (g === 'male') bmr += 5;
        else bmr -= 161;

        // Multiply by 1.2 for sedentary baseline
        const maintenance = Math.round(bmr * 1.2);

        const resEnv = document.getElementById('bmr-res');
        resEnv.style.display = 'block';
        resEnv.innerHTML = `
            Basal Rate: ${Math.round(bmr)} kcal<br>
            Maintenance: <strong style="color:var(--text);">${maintenance} kcal</strong>
        `;
    } else {
        alert('Please enter weight, height, and age');
    }
}

function calcORM() {
    const w = parseFloat(document.getElementById('orm-w').value);
    const r = parseFloat(document.getElementById('orm-r').value);

    if (w && r) {
        // Epley Formula: w * (1 + r/30)
        const orm = Math.round(w * (1 + r / 30));

        const resEnv = document.getElementById('orm-res');
        resEnv.style.display = 'block';
        resEnv.innerHTML = `
            Est. 1RM: <strong style="color:var(--text); font-size:22px;">${orm} kg</strong>
        `;
    } else {
        alert('Please enter weight and reps');
    }
}

function clearAllData() {
    if (confirm('Are you sure you want to RESET all data? This cannot be undone.')) {
        localStorage.clear();
        location.reload();
    }
}

// Start the app
init();
