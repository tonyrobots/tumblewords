import * as Ui from "./uiHandling.js";

document.addEventListener("DOMContentLoaded", () => {
  // globals
  const startButton = document.getElementById("start-button");
  const visibleRows = 5; // Number of rows visible on the screen
  const wordLength = 5;
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const gameTime = 120; // game length in seconds
  const timeAddedPerWord = 10; // seconds added to the timer per word found
  let grid = [];
  let fillerGrid = [];
  let wordlist = [];
  let completedWords = [];
  let currentSelection = [];
  let focusCol = 0;
  let timeRemaining = gameTime;
  let timerInterval;
  let gameOver = false;

  startButton.addEventListener("click", startGame);
  // add keyboard support for letter selection
  document.addEventListener("keydown", (event) => {
    handleKeydown(event);
  });

  loadWordList("sgb-words").then((words) => {
    wordlist = words;
    // show start button
    startButton.textContent = "Let's Go!";
    startButton.style.display = "block";
  });

  // generate and render empty grid
  grid = generateGrid(
    ["?????", "?????", "?????", "?????", "?????", "?????"],
    true
  );
  renderGrid(grid);

  function initializeGame() {
    // Logic to initialize game
    addRowsToFillerGrid(4); // add a bank of rows to filler grid to drop in as words are removed
    timeRemaining = 120; // 2 minutes in seconds
    focusCol = 0;
    completedWords = [];
  }

  function startGame() {
    gameOver = false;
    const selectedWords = chooseWords(wordlist, visibleRows);
    grid = generateGrid(selectedWords);
    renderGrid(grid);
    console.log(selectedWords);
    // hide start button
    startButton.style.display = "none";

    // make all the tiles fall
    // setTimeout(() => {
    //   applyFallingAnimation([5, 5, 5, 5, 5]);
    // }, 500);

    initializeGame();
    startTimer();
    gameLoop();
  }

  function gameLoop() {
    //update score
    document.getElementById("score").innerHTML = completedWords.length;
    //update valid words
    let validWordsCount = countValidWordsInGrid();
    document.getElementById("valid-words").innerHTML = validWordsCount;

    //update found words list
    document.getElementById("found-words").innerHTML =
      completedWords.join("<br /> ");

    // if no valid words left, game over!
    if (validWordsCount === 0) {
      endGame("No valid words left in the grid!");
      return;
    }
  }

  function startTimer() {
    timerInterval = setInterval(() => {
      if (timeRemaining < 0) {
        endGame();
        return;
      }

      timeRemaining--;
      updateTimerDisplay();
    }, 1000);
  }

  function updateTimerDisplay() {
    let timeRemainingDisplay = Math.max(timeRemaining, 0); // Don't allow negative time
    const minutes = Math.floor(timeRemainingDisplay / 60);
    const seconds = timeRemainingDisplay % 60;
    const formattedTime = `${minutes}:${seconds.toString().padStart(2, "0")}`;
    const timerElement = document.getElementById("timer");
    timerElement.textContent = formattedTime;
    if (timeRemaining < 10 && timeRemaining >= 0) {
      timerElement.parentElement.classList.add("alert");
    } else {
      timerElement.parentElement.classList.remove("alert");
    }
  }

  function addTime(seconds) {
    timeRemaining += seconds;
    // Make sure the timer display is updated immediately after adding time
    updateTimerDisplay();
  }

  function endGame(message = "Time's up!") {
    clearInterval(timerInterval);
    const timerElement = document.getElementById("timer");
    timerElement.textContent = "💀";
    gameOver = true;
    timeRemaining = 0;
    if (completedWords.length > 15) {
      Ui.triggerConfetti();
    }
    Ui.displayMessage(message);
    Ui.displayMessage(
      "Game Over! You found " + completedWords.length + " words."
    );
    // show start button after 3 seconds
    setTimeout(() => {
      startButton.style.display = "block";
      startButton.textContent = "One more time!";
    }, 3000);
  }

  function loadWordList(filename) {
    return fetch(`words/${filename}.txt`)
      .then((response) => response.text())
      .then((text) => text.split("\n").map((word) => word.trim().toUpperCase()))
      .catch((error) => console.error("Failed to load word list:", error));
  }

  function renderGrid(grid) {
    console.log("rows in grid:", grid.length);

    const gridContainer = document.getElementById("grid");

    gridContainer.innerHTML = ""; // Clear previous grid
    let onscreenGrid = grid.slice(0, visibleRows); // Only render the visible rows
    onscreenGrid.forEach((row, rowIndex) => {
      let rowDiv = document.createElement("div");
      rowDiv.className = "grid-row";
      row.forEach((cell, colIndex) => {
        let cellDiv = document.createElement("div");
        cellDiv.className = "grid-cell";
        cellDiv.textContent = cell;
        if (cell === "?") {
          cellDiv.classList.add("wildcard");
        }
        cellDiv.addEventListener("click", () =>
          selectLetter(rowIndex, colIndex, cell)
        );
        rowDiv.appendChild(cellDiv);
      });
      gridContainer.appendChild(rowDiv);
    });
    // console.log("Number of valid words in the grid:", countValidWordsInGrid());
    console.log("Valid words in the grid:", findValidWordsInGrid());
    // console.log(grid);
  }

  function chooseWords(wordlist, count) {
    let selected = [];
    for (let i = 0; i < count; i++) {
      const randomIndex = Math.floor(Math.random() * wordlist.length);
      selected.push(wordlist[randomIndex]);
    }
    return selected;
  }

  function generateGrid(words, empty = false) {
    // Determine the number of rows based on the number of words
    let numRows = words.length;
    let grid = Array.from({ length: numRows }, () => new Array(5).fill(""));

    const wildcardPct = 0.04; // percent chance a letter will be a wildcard

    // For each column, distribute the letters across random rows
    for (let col = 0; col < 5; col++) {
      // Extract the letter for this column from each word
      let columnLetters = words.map((word) => word[col] || ""); // Use an empty string if the letter doesn't exist

      // Shuffle the letters to randomize their positions
      let shuffledLetters = shuffleArray(columnLetters);

      // Assign the shuffled letters to the grid
      for (let row = 0; row < numRows; row++) {
        // Check if this letter should be a wildcard
        if (Math.random() < wildcardPct && !empty) {
          grid[row][col] = "?";
        } else {
          grid[row][col] = shuffledLetters[row];
        }
      }
    }

    return grid;
  }

  function addRowsToFillerGrid(numRows) {
    const newRows = generateGrid(chooseWords(wordlist, numRows));
    fillerGrid = fillerGrid.concat(newRows);
    console.log("added rows to filler grid:", newRows.length);
  }

  function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      let j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]]; // Swap elements
    }
    return array;
  }

  function handleKeydown(e) {
    if (gameOver) return;

    // only accept letters and backspace
    if (!alphabet.includes(e.key.toUpperCase()) && e.key !== "Backspace")
      return;

    // if a matching letter is in the focus column, select the first match
    const letter = e.key.toUpperCase();

    // handle backspace
    if (e.key === "Backspace") {
      clearSelection();
      return;
    }
    const col = focusCol;

    const row = grid.findIndex((row) => row[col] === letter);
    if (row !== -1) {
      selectLetter(row, col, letter);
    } else {
      // if no matching letter is in the focus column, select the first wildcard
      const row = grid.findIndex((row) => row[col] === "?");
      if (row !== -1) {
        selectLetter(row, col, "?");
      }
    }
  }

  function selectLetter(rowIndex, colIndex, letter) {
    // Check if the game is over
    if (gameOver) return;

    // Check if this specific cell is already selected
    const existingSelectionIndex = currentSelection.findIndex(
      (sel) => sel.colIndex === colIndex && sel.rowIndex === rowIndex
    );

    if (existingSelectionIndex !== -1) {
      // The cell is already selected - deselect it
      toggleCellSelection(rowIndex, colIndex, false);
      currentSelection.splice(existingSelectionIndex, 1);
      // set focus to this column
      focusCol = colIndex;
      return; // Exit the function as no new cell is being selected
    }

    // Check if another letter in this column is already selected
    const existingColumnSelectionIndex = currentSelection.findIndex(
      (sel) => sel.colIndex === colIndex
    );

    if (existingColumnSelectionIndex !== -1) {
      // Deselect the previously selected cell in this column
      toggleCellSelection(
        currentSelection[existingColumnSelectionIndex].rowIndex,
        currentSelection[existingColumnSelectionIndex].colIndex,
        false
      );
      // Remove the existing selection from this column
      currentSelection.splice(existingColumnSelectionIndex, 1);
    }

    // Insert the new selection at the correct position
    currentSelection.splice(colIndex, 0, { rowIndex, colIndex, letter });

    // Select the new cell
    toggleCellSelection(rowIndex, colIndex, true);
    // animateLetterToWord(rowIndex, colIndex, letter);
    // move focus to selected column + 1
    focusCol = (colIndex + 1) % wordLength;

    // Sort the current selection by column index
    currentSelection.sort((a, b) => a.colIndex - b.colIndex);

    // Check if a complete word is formed
    if (currentSelection.length === wordLength) {
      // validate word after a delay
      setTimeout(() => {
        validateWord(currentSelection.map((sel) => sel.letter).join(""));
      }, 300);
    }
  }

  function validateWord(word) {
    console.log("Validating word:", word);
    // Check if the word contains a wildcard
    if (word.includes("?")) {
      // Find the first word in the wordlist that matches the pattern
      const matchingWord = findMatchingWordWithWildcard(word);
      if (matchingWord) {
        // Replace the wildcard with the correct letter
        word = matchingWord;
      }
    }
    if (wordlist.includes(word)) {
      completedWords.push(word);
      addTime(timeAddedPerWord);
      updateGrid(); // This will eventually clear the selection
    } else {
      Ui.displayMessage("Not a valid word!", true);
      clearSelection(); // Clear the selection immediately for invalid word
      clearWordConstruction(); // clear the staging area
    }
  }

  function findMatchingWordWithWildcard(word) {
    let regexPattern = word.replace(/\?/g, "."); // Replace wildcard with regex dot
    let regex = new RegExp("^" + regexPattern + "$", "i");

    // Find the first word in the wordlist that matches the pattern
    return wordlist.find((word) => regex.test(word));
  }

  function findValidWordsInGrid() {
    let validWords = [];

    wordlist.forEach((word) => {
      if (canFormWordInGrid(word)) {
        validWords.push(word);
      }
    });

    return validWords;
  }
  function countValidWordsInGrid() {
    let validWords = findValidWordsInGrid();
    return validWords.length;
  }

  function canFormWordInGrid(word) {
    for (let col = 0; col < wordLength; col++) {
      let letterFoundInColumn = false;
      for (let row = 0; row < visibleRows; row++) {
        // The letter matches or the cell contains a wildcard
        if (grid[row][col] === word[col] || grid[row][col] === "?") {
          letterFoundInColumn = true;
          break;
        }
      }
      // If no matching letter or wildcard was found in the column, the word can't be formed
      if (!letterFoundInColumn) return false;
    }
    return true;
  }

  function clearSelection() {
    // Clear the visual selection
    currentSelection.forEach((sel) => {
      toggleCellSelection(sel.rowIndex, sel.colIndex, false); // Deselect the cell
    });

    // Reset the current selection
    currentSelection = [];
    focusCol = 0;
  }

  function toggleCellSelection(rowIndex, colIndex, isSelected) {
    const cellDiv = document.querySelector(
      `.grid-row:nth-child(${rowIndex + 1}) .grid-cell:nth-child(${
        colIndex + 1
      })`
    );
    if (cellDiv) {
      if (isSelected) {
        cellDiv.classList.add("selected");
      } else {
        cellDiv.classList.remove("selected");
        removeLetterBlock(colIndex); // Remove the letter block from the word construction area
      }
    }
  }

  function updateGrid() {
    let disappearingRowIndices = [];
    // Step 1: Apply disappearing animation
    currentSelection.forEach((sel) => {
      const cellDiv = getCellDiv(sel.rowIndex, sel.colIndex);
      cellDiv.classList.add("disappearing");
      disappearingRowIndices.push(sel.rowIndex);
    });

    // Step 2: Update grid data after disappearing animation completes
    setTimeout(() => {
      updateGridData();

      // Step 3: Apply falling animation
      applyFallingAnimation(disappearingRowIndices);

      // Step 4: Re-render grid after falling animation completes
      setTimeout(() => {
        renderGrid(grid);
        resetCellClasses();
        clearSelection(); // Now clear the selection
        gameLoop(); // do anything else that should happen each time the grid is updated
      }, 500); // match this with the falling animation duration
    }, 500); // match this with the disappearing animation duration
  }

  function updateGridData() {
    // Shift letters down in each column of the visible part
    currentSelection.forEach((sel) => {
      for (let row = sel.rowIndex; row > 0; row--) {
        grid[row][sel.colIndex] = grid[row - 1][sel.colIndex];
      }
      // Pull a letter from the first filler row into the top visible row
      grid[0][sel.colIndex] = fillerGrid[0][sel.colIndex];
    });

    // Shift the filler grid down
    for (let row = 0; row < fillerGrid.length - 1; row++) {
      for (let col = 0; col < 5; col++) {
        fillerGrid[row][col] = fillerGrid[row + 1][col];
      }
    }

    // pop the last item in the fillergrid since it's been copied down
    fillerGrid.pop();

    // Replenish the filler rows if necessary
    if (fillerGrid.length < 3) {
      addRowsToFillerGrid(3);
    }
  }

  function applyFallingAnimation(disappearingRowIndices) {
    for (let col = 0; col < wordLength; col++) {
      for (let row = 0; row < visibleRows; row++) {
        // Get the cell div in the current grid
        const cellDiv = getCellDiv(row, col);

        // Check if the cell is above the disappearing cells for this column
        if (cellDiv && disappearingRowIndices[col] > row) {
          cellDiv.classList.add("falling");
        }
      }
    }
  }

  function resetCellClasses() {
    document.querySelectorAll(".grid-cell").forEach((cell) => {
      cell.classList.remove(
        "selected",
        "falling",
        "disappearing",
        "moving-letter"
      );
    });
  }

  function getCellDiv(rowIndex, colIndex) {
    return document.querySelector(
      `.grid-row:nth-child(${rowIndex + 1}) .grid-cell:nth-child(${
        colIndex + 1
      })`
    );
  }
  function animateLetterToWord(rowIndex, colIndex, letter) {
    const letterDiv = getCellDiv(rowIndex, colIndex);
    const wordConstructionDiv = document.getElementById("word-construction");
    const wordConstructionSlot = document.getElementById(
      `slot-${colIndex + 1}`
    );

    // Clone the letter div to animate it
    const clone = letterDiv.cloneNode(true);
    clone.classList.add("moving-letter");

    // Position the clone at the same position as the original letterDiv
    const rect = letterDiv.getBoundingClientRect();
    clone.style.position = "fixed";
    clone.style.left = `${rect.left}px`;
    clone.style.top = `${rect.top}px`;
    clone.style.margin = "0"; // Remove margin as it's now absolutely positioned

    // Append clone to body to allow free movement
    document.body.appendChild(clone);

    // Calculate the end position for the animation
    const targetRect = wordConstructionDiv.getBoundingClientRect();
    const transformX = targetRect.left - rect.left;
    const transformY = targetRect.top - rect.top + window.scrollY; // Include scroll offset

    // Start the animation
    requestAnimationFrame(() => {
      clone.style.transform = `translate(${transformX}px, ${transformY}px)`;
      clone.style.opacity = "0"; // Fade out the clone

      // After the animation completes, add the letter to the word construction area
      setTimeout(() => {
        // wordConstructionDiv.appendChild(createLetterBlock(letter)); // Add the letter block to the container
        // add the letter block to the correct slot
        // wordConstructionSlot.appendChild(createLetterBlock(letter));
        wordConstructionSlot.innerHTML = letter;
        wordConstructionSlot.classList.remove("disappearing");
        clone.remove(); // Remove the animated clone
      }, 200); // This timeout should match the transition duration
    });
  }

  function removeLetterBlock(col) {
    const wordConstructionSlot = document.getElementById(`slot-${col + 1}`);
    wordConstructionSlot.innerHTML = "";
    wordConstructionSlot.classList.add("disappearing");
  }

  function clearWordConstruction() {
    const wordConstructionDiv = document.getElementById("word-construction");
    for (let col = 0; col < wordLength; col++) {
      removeLetterBlock(col);
    }
  }
});
