const storageKey = "snapcal-ai-data-v1";
const dailyResetDate = new Date().toISOString().slice(0, 10);

const defaultState = {
  profile: {
    name: "",
    age: "",
    height: "",
    weight: "",
    targetCalories: 2100,
    targetProtein: 120,
    goalFocus: "fat-loss"
  },
  meals: [],
  streak: 0,
  lastLogDate: ""
};

const state = loadState();

const profileForm = document.getElementById("profileForm");
const foodForm = document.getElementById("foodForm");
const preview = document.getElementById("preview");
const mealLog = document.getElementById("mealLog");
const mealTemplate = document.getElementById("mealTemplate");

const caloriesConsumedEl = document.getElementById("caloriesConsumed");
const caloriesRemainingEl = document.getElementById("caloriesRemaining");
const proteinConsumedEl = document.getElementById("proteinConsumed");
const progressPercentEl = document.getElementById("progressPercent");
const progressFillEl = document.getElementById("progressFill");
const suggestionsEl = document.getElementById("suggestions");
const streakPill = document.getElementById("streakPill");
const statusPill = document.getElementById("statusPill");

hydrateProfileForm();
renderAll();

profileForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(profileForm);

  state.profile = {
    name: formData.get("name") || document.getElementById("name").value,
    age: Number(document.getElementById("age").value),
    height: Number(document.getElementById("height").value),
    weight: Number(document.getElementById("weight").value),
    targetCalories: Number(document.getElementById("targetCalories").value),
    targetProtein: Number(document.getElementById("targetProtein").value),
    goalFocus: document.getElementById("goalFocus").value
  };

  saveState();
  renderAll();
  toast("Profile saved. AI suggestions have been refreshed.");
});

foodForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const imageInput = document.getElementById("foodImage");
  const imageFile = imageInput.files[0];

  if (!imageFile) {
    toast("Please upload a food image first.");
    return;
  }

  const photoUrl = await toDataUrl(imageFile);
  const inferred = inferMealFromImage(imageFile.name, document.getElementById("foodName").value);
  const portionFactor = Number(document.getElementById("portionSize").value);

  const calories = Math.round(inferred.baseCalories * portionFactor);
  const protein = Math.round(inferred.protein * portionFactor);

  const meal = {
    id: crypto.randomUUID(),
    name: document.getElementById("foodName").value.trim() || inferred.label,
    mealType: document.getElementById("mealType").value,
    calories,
    protein,
    aiNote: inferred.note,
    photoUrl,
    createdAt: new Date().toISOString()
  };

  state.meals.unshift(meal);
  updateStreak();
  saveState();

  preview.classList.remove("hidden");
  preview.innerHTML = `<img src="${meal.photoUrl}" alt="${meal.name}" /><p><strong>${meal.name}</strong> detected — ${meal.calories} kcal, ${meal.protein}g protein.</p>`;

  foodForm.reset();
  renderAll();
});

document.getElementById("clearLog").addEventListener("click", () => {
  if (!state.meals.length) return;
  state.meals = [];
  saveState();
  renderAll();
  toast("Meal log cleared.");
});

function loadState() {
  const fromStorage = localStorage.getItem(storageKey);
  if (!fromStorage) return structuredClone(defaultState);

  try {
    const parsed = JSON.parse(fromStorage);
    return {
      ...structuredClone(defaultState),
      ...parsed,
      profile: {
        ...defaultState.profile,
        ...(parsed.profile || {})
      },
      meals: Array.isArray(parsed.meals) ? parsed.meals : []
    };
  } catch {
    return structuredClone(defaultState);
  }
}

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify(state));
}

function hydrateProfileForm() {
  document.getElementById("name").value = state.profile.name || "";
  document.getElementById("age").value = state.profile.age || "";
  document.getElementById("height").value = state.profile.height || "";
  document.getElementById("weight").value = state.profile.weight || "";
  document.getElementById("targetCalories").value = state.profile.targetCalories || 2100;
  document.getElementById("targetProtein").value = state.profile.targetProtein || 120;
  document.getElementById("goalFocus").value = state.profile.goalFocus || "fat-loss";
}

function renderAll() {
  const todayMeals = state.meals.filter((meal) => meal.createdAt.slice(0, 10) === dailyResetDate);
  const consumedCalories = todayMeals.reduce((sum, meal) => sum + meal.calories, 0);
  const consumedProtein = todayMeals.reduce((sum, meal) => sum + meal.protein, 0);

  const remaining = Math.max(0, state.profile.targetCalories - consumedCalories);
  const progress = Math.min(100, Math.round((consumedCalories / state.profile.targetCalories) * 100 || 0));

  caloriesConsumedEl.textContent = consumedCalories;
  caloriesRemainingEl.textContent = remaining;
  proteinConsumedEl.textContent = `${consumedProtein}g`;
  progressPercentEl.textContent = `${progress}%`;
  progressFillEl.style.width = `${progress}%`;

  statusPill.textContent =
    progress <= 95
      ? "🎯 On track"
      : progress <= 110
      ? "⚖️ Close to target"
      : "🚨 Above target";

  streakPill.textContent = `🔥 ${state.streak || 0} day streak`;

  renderMealLog();
  renderSuggestions(todayMeals, consumedCalories, consumedProtein);
}

function renderMealLog() {
  mealLog.innerHTML = "";

  if (!state.meals.length) {
    mealLog.innerHTML = "<p>No meals yet. Snap your first meal image to start tracking.</p>";
    return;
  }

  state.meals.forEach((meal) => {
    const node = mealTemplate.content.cloneNode(true);
    node.querySelector("img").src = meal.photoUrl;
    node.querySelector("img").alt = meal.name;
    node.querySelector("h4").textContent = meal.name;
    node.querySelector(".meal-calories").textContent = `${meal.calories} kcal`;
    node.querySelector(".meal-meta").textContent = `${meal.mealType} • ${formatDateTime(meal.createdAt)} • ${meal.protein}g protein`;
    node.querySelector(".meal-note").textContent = `AI note: ${meal.aiNote}`;

    mealLog.appendChild(node);
  });
}

function renderSuggestions(todayMeals, consumedCalories, consumedProtein) {
  const suggestions = [];
  const { name, targetCalories, targetProtein, goalFocus } = state.profile;

  const identity = name ? `${name}, ` : "";

  if (!todayMeals.length) {
    suggestions.push(`${identity}start with a protein-rich breakfast photo to activate your daily routine.`);
  }

  if (consumedCalories < targetCalories * 0.45) {
    suggestions.push("You're under 45% of calories so far. Add a balanced meal with complex carbs and lean protein.");
  }

  if (consumedCalories > targetCalories * 1.1) {
    suggestions.push("You are above your target. For your next meal, choose high-volume low-calorie foods (veggies/soup)." );
  }

  if (consumedProtein < targetProtein * 0.7) {
    suggestions.push("Protein is lagging behind target. Consider eggs, Greek yogurt, chicken, tofu, or lentils.");
  }

  const mealTypes = todayMeals.map((meal) => meal.mealType);
  if (!mealTypes.includes("Snack") && todayMeals.length >= 2) {
    suggestions.push("You skipped snacks today. Add a planned snack to prevent late-night overeating.");
  }

  const recurringLateMeals = state.meals
    .slice(0, 12)
    .filter((meal) => Number(new Date(meal.createdAt).getHours()) >= 21).length;

  if (recurringLateMeals >= 3) {
    suggestions.push("Habit pattern: frequent late meals detected. Try setting a kitchen close time 2 hours before sleep.");
  }

  if (goalFocus === "fat-loss") {
    suggestions.push("Fat-loss mode: aim for 25-35g protein in each meal to keep hunger controlled.");
  }
  if (goalFocus === "muscle-gain") {
    suggestions.push("Muscle-gain mode: add one extra protein + carb snack post workout.");
  }
  if (goalFocus === "performance") {
    suggestions.push("Performance mode: include carbs around training sessions for better energy output.");
  }

  if (!suggestions.length) {
    suggestions.push("Great consistency today. Keep the same meal quality and hydration rhythm.");
  }

  suggestionsEl.innerHTML = suggestions.slice(0, 6).map((item) => `<li>${item}</li>`).join("");
}

function inferMealFromImage(filename = "", manualName = "") {
  const seed = `${filename} ${manualName}`.toLowerCase();

  const catalog = [
    { key: ["salad", "greens"], label: "Mixed salad bowl", baseCalories: 310, protein: 17, note: "Fiber-forward meal. Keep dressing moderate." },
    { key: ["pizza"], label: "Pizza slice plate", baseCalories: 420, protein: 16, note: "Higher calorie density, pair with side salad." },
    { key: ["burger", "sandwich"], label: "Burger / sandwich", baseCalories: 520, protein: 24, note: "Try adding vegetables for volume and satiety." },
    { key: ["rice", "biryani"], label: "Rice-based meal", baseCalories: 480, protein: 14, note: "Watch portion size and add lean protein." },
    { key: ["pasta", "noodle"], label: "Pasta / noodles", baseCalories: 460, protein: 15, note: "Balance with vegetables and protein side." },
    { key: ["chicken", "steak", "fish"], label: "Protein plate", baseCalories: 390, protein: 34, note: "Strong protein meal. Great for muscle retention." },
    { key: ["dessert", "cake", "ice"], label: "Dessert", baseCalories: 340, protein: 5, note: "Treat meal detected, keep next meal lighter." },
    { key: ["smoothie", "shake"], label: "Smoothie", baseCalories: 280, protein: 20, note: "Liquid calories digest quickly—pair with fiber." }
  ];

  for (const entry of catalog) {
    if (entry.key.some((token) => seed.includes(token))) {
      return entry;
    }
  }

  return {
    label: "Mixed meal",
    baseCalories: 410,
    protein: 18,
    note: "General estimate used. Add food name keywords for better AI accuracy."
  };
}

function updateStreak() {
  const today = dailyResetDate;

  if (state.lastLogDate === today) return;

  const oneDay = 86400000;
  if (!state.lastLogDate) {
    state.streak = 1;
    state.lastLogDate = today;
    return;
  }

  const diff = Math.round((new Date(today) - new Date(state.lastLogDate)) / oneDay);

  state.streak = diff === 1 ? state.streak + 1 : 1;
  state.lastLogDate = today;
}

function formatDateTime(iso) {
  const date = new Date(iso);
  return new Intl.DateTimeFormat([], {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function toDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function toast(message) {
  const node = document.createElement("div");
  node.textContent = message;
  node.style.position = "fixed";
  node.style.bottom = "18px";
  node.style.right = "18px";
  node.style.padding = "0.6rem 0.8rem";
  node.style.background = "rgba(0,0,0,0.72)";
  node.style.border = "1px solid rgba(255,255,255,0.2)";
  node.style.borderRadius = "10px";
  node.style.zIndex = "50";

  document.body.appendChild(node);
  setTimeout(() => {
    node.remove();
  }, 2100);
}
