import parsePDF from "./parsePDF.js";

let branch = "main";
if (window.location.hostname.includes("--")) {
  branch = window.location.hostname.split("--")[0];
}
document.getElementById(
  "scraper-link"
).href = `https://github.com/nikhilmwarrier/jee-2024-scraper/blob/${branch}/scraper.js`;

const mainForm = document.getElementById("main-form");
mainForm.addEventListener("submit", async e => {
  e.preventDefault();
  getFormData(mainForm);
});

const pdfForm = document.getElementById("pdf-form");
pdfForm.addEventListener("submit", e => {
  e.preventDefault();
  getFormData(pdfForm);
});

async function getFormData(form) {
  const formData = new FormData(form);
  const shift = formData.get("shift");

  try {
    let responses = {};
    if (form.id === "main-form") {
      responses = JSON.parse(formData.get("responses"));
      compareAnswers(responses, shift);
    } else if (form.id === "pdf-form") {
      responses = await parsePDF();
      await compareAnswers(responses, shift);
    }
  } catch (err) {
    console.error("JSONError:", err);
    alert("Error while parsing JSON. See console for more details.");
  }
}

async function compareAnswers(user, shift) {
  const fetchedResponse = await fetch("./keys/" + shift + ".json");
  const nta = await fetchedResponse.json();

  let overallCorrect = 0;
  let overallIncorrect = 0;
  let overallSkipped = 0;
  let overallDropped = 0;
  let errorInKeys = [];

  let correct = {
    0: 0, // 0 = Maths
    1: 0, // 1 = Physics
    2: 0, // 2 = Chem
  };
  let incorrect = {
    0: 0, // 0 = Maths
    1: 0, // 1 = Physics
    2: 0, // 2 = Chem
  };

  const firstKey = Object.keys(nta).sort((a, b) => a - b)[0];
  let incorrectArray = [];

  for (const key in nta) {
    const ntaAns = Number(`${nta[key]}`.trim());
    const subject = Math.floor((key % firstKey) / 30);
    // console.log(subject)
    if (user.hasOwnProperty(key)) {
      if (user[key]["hasAnswered"]) {
        const ownAns = Number(`${user[key].ownAnswer}`.trim());
        console.log(ownAns, ntaAns);
        if (ntaAns === "DROP") {
          overallDropped += 1;
        } else {
          if (ntaAns === ownAns) {
            overallCorrect += 1;
            correct[subject] += 1;
          } else {
            overallIncorrect += 1;
            incorrect[subject] += 1;
            incorrectArray.push({
              qnID: key,
              ownAns,
              ntaAns,
            });
          }
        }
      } else {
        overallSkipped += 1;
      }
    } else errorInKeys.push(key);
  }
  if (errorInKeys.length > 0) {
    alert("Error in keys:\n" + errorInKeys.toString());
    errorInKeys = [];
  }
  generateScorecard(overallCorrect, overallIncorrect, overallDropped, shift, [
    correct,
    incorrect,
    incorrectArray,
  ]);
}

function generateScorecard(
  overallCorrect,
  overallIncorrect,
  overallDropped,
  shift,
  allData
) {
  const resultDiv = document.getElementById("result");
  const shiftEl = resultDiv.querySelector(".shift span");
  const scoreEl = resultDiv.querySelector(".score span");
  const attemptedEl = resultDiv.querySelector("#stats .attempted");
  const correctEl = resultDiv.querySelector("#stats .correct");
  const incorrectEl = resultDiv.querySelector("#stats .incorrect");
  const droppedEl = resultDiv.querySelector("#stats .dropped");
  const totalScoreEl = resultDiv.querySelector("#stats .score");

  const finalScore = calculateScore(
    overallCorrect,
    overallIncorrect,
    overallDropped
  );

  shiftEl.innerText = shift;
  scoreEl.innerText = finalScore;
  attemptedEl.innerText = overallCorrect + overallIncorrect;
  correctEl.innerText = overallCorrect;
  incorrectEl.innerText = overallIncorrect;
  droppedEl.innerText = overallDropped;
  totalScoreEl.innerText = finalScore;

  const subjects = {
    maths: 0,
    phy: 1,
    chem: 2,
  };
  for (const key in subjects) {
    resultDiv.querySelector(`#stats .attempted-${key}`).innerText =
      allData[0][subjects[key]] + allData[1][subjects[key]];
    resultDiv.querySelector(`#stats .correct-${key}`).innerText =
      allData[0][subjects[key]];
    resultDiv.querySelector(`#stats .incorrect-${key}`).innerText =
      allData[1][subjects[key]];
    resultDiv.querySelector(`#stats .score-${key}`).innerText = calculateScore(
      allData[0][subjects[key]],
      allData[1][subjects[key]]
    );
  }

  const incorrectQnsTable = resultDiv.querySelector("#incorrectQns");
  allData[2].forEach(qn => {
    const row = document.createElement("tr");
    row.innerHTML = `<td>${qn.qnID}</td>
        <td>${qn.ownAns}</td>
        <td>${qn.ntaAns}</td>`;
    incorrectQnsTable.appendChild(row);
  });
}

function calculateScore(correct, incorrect, dropped) {
  if (!dropped) dropped = 0;
  return (correct + dropped) * 4 - incorrect;
}

function copyScript() {
  const scriptArea = document.getElementById("scriptarea");
  navigator.clipboard.writeText(scriptArea.value);
  alert("Copied!");
}
