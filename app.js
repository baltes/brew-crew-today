const BREWERS_TEAM_ID = 158;
const API_BASE = "https://statsapi.mlb.com/api/v1/schedule";

const form = document.querySelector("#date-form");
const dateInput = document.querySelector("#game-date");
const todayButton = document.querySelector("#today-button");
const result = document.querySelector("#result");

const toDateInputValue = (date) => {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
};

const formatDateForDisplay = (dateValue) =>
  new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${dateValue}T12:00:00`));

const formatGameTime = (gameDate) =>
  new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(gameDate));

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const setResult = ({ status, title, details, facts = [], error = false }) => {
  result.classList.toggle("error", error);
  result.innerHTML = `
    <p class="status-label">${escapeHtml(status)}</p>
    <h2>${escapeHtml(title)}</h2>
    <p class="details">${escapeHtml(details)}</p>
    ${
      facts.length
        ? `<div class="game-facts">${facts
            .map(
              ([label, value]) => `
                <div class="fact">
                  <span>${escapeHtml(label)}</span>
                  <span>${escapeHtml(value)}</span>
                </div>
              `,
            )
            .join("")}</div>`
        : ""
    }
  `;
};

const getBrewersSide = (game) => {
  const { away, home } = game.teams;
  return away.team.id === BREWERS_TEAM_ID ? "away" : home.team.id === BREWERS_TEAM_ID ? "home" : null;
};

const checkDate = async (dateValue) => {
  setResult({
    status: "Checking",
    title: "Looking up the Brewers schedule...",
    details: formatDateForDisplay(dateValue),
  });

  const params = new URLSearchParams({
    sportId: "1",
    teamId: String(BREWERS_TEAM_ID),
    date: dateValue,
    hydrate: "team,venue",
  });

  const response = await fetch(`${API_BASE}?${params}`);

  if (!response.ok) {
    throw new Error("MLB schedule request failed");
  }

  const schedule = await response.json();
  const games = schedule.dates?.[0]?.games ?? [];

  if (games.length === 0) {
    setResult({
      status: "No game",
      title: "The Brewers are off.",
      details: `No Brewers game is listed for ${formatDateForDisplay(dateValue)}.`,
    });
    return;
  }

  const game = games[0];
  const brewersSide = getBrewersSide(game);
  const opponentSide = brewersSide === "home" ? "away" : "home";
  const opponent = game.teams[opponentSide].team.name;
  const homeAway = brewersSide === "home" ? "Home" : "Away";
  const venue = game.venue?.name ?? "Venue TBD";
  const status = game.status?.detailedState ?? "Scheduled";

  setResult({
    status: "Game day",
    title: `Brewers ${brewersSide === "home" ? "host" : "visit"} the ${opponent}.`,
    details: `${formatDateForDisplay(dateValue)} at ${venue}.`,
    facts: [
      ["Opponent", opponent],
      ["Where", `${homeAway}, ${venue}`],
      ["Time", formatGameTime(game.gameDate)],
      ["Status", status],
    ],
  });
};

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    await checkDate(dateInput.value);
  } catch (error) {
    setResult({
      status: "Error",
      title: "I could not reach the MLB schedule.",
      details: "Try again in a moment. If this keeps happening, the API may be unavailable.",
      error: true,
    });
  }
});

todayButton.addEventListener("click", () => {
  dateInput.value = toDateInputValue(new Date());
  form.requestSubmit();
});

dateInput.value = toDateInputValue(new Date());
form.requestSubmit();
