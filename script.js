document.addEventListener('DOMContentLoaded', () => {
    const textInput = document.getElementById('text-input');
    const numWordsInput = document.getElementById('num-words');
    const btnCreate = document.getElementById('btn-create');
    const btnRestartExercise = document.getElementById('btn-restart-exercise');
    const btnRestartApp = document.getElementById('btn-restart-app');
    const btnToggleView = document.getElementById('btn-toggle-view');

    const setupPanel = document.getElementById('setup-panel');
    const exerciseArea = document.getElementById('exercise-area');
    const gappedTextDiv = document.getElementById('gapped-text');
    const wordBankDiv = document.getElementById('word-bank');
    const messageArea = document.getElementById('message-area');

    let originalText = '';
    let currentTokens = [];
    let currentChosenWords = [];
    let isWebView = false;

    btnCreate.addEventListener('click', createExercise);
    btnRestartExercise.addEventListener('click', restartExercise);
    btnRestartApp.addEventListener('click', restartApplication);
    btnToggleView.addEventListener('click', toggleWebView);

    function showMessage(text, type = 'info') {
        messageArea.textContent = text;
        messageArea.className = 'message'; // Reset classes
        if (type) {
            messageArea.classList.add(type);
        }
        // Auto-clear message after some time
        setTimeout(() => {
            messageArea.textContent = '';
            messageArea.className = 'message';
        }, 5000);
    }

    function tokenizeText(text) {
        const tokens = [];
        const regex = /(\S+)|(\s+)/g; // \S+ for words, \s+ for separators
        let match;
        while ((match = regex.exec(text)) !== null) {
            if (match[1]) { // \S+ group (word)
                tokens.push({ type: 'word', text: match[1] });
            } else if (match[2]) { // \s+ group (separator)
                tokens.push({ type: 'separator', text: match[2] });
            }
        }
        return tokens;
    }

    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    function selectWordsToReplace(tokens, numToReplace) {
        const wordTokenObjects = [];
        tokens.forEach((token, index) => {
            if (token.type === 'word') {
                wordTokenObjects.push({ token, originalIndexInTokens: index });
            }
        });

        numToReplace = Math.min(numToReplace, wordTokenObjects.length);
        if (numToReplace <= 0 && wordTokenObjects.length > 0) {
             showMessage('Number of words to replace must be at least 1.', 'error');
             return null;
        }
        if (wordTokenObjects.length === 0) {
            showMessage('No words found in the text to replace.', 'error');
            return null;
        }


        shuffleArray(wordTokenObjects);

        const chosenWordsForBank = [];
        // Create a copy of tokens to modify for gaps
        const tokensForDisplay = JSON.parse(JSON.stringify(tokens)); 

        for (let i = 0; i < numToReplace; i++) {
            const selected = wordTokenObjects[i];
            const wordId = `word-${i}`;
            
            chosenWordsForBank.push({
                text: selected.token.text,
                id: wordId,
            });
            
            // Mark the token in our display copy as a gap
            tokensForDisplay[selected.originalIndexInTokens].isGap = true;
            tokensForDisplay[selected.originalIndexInTokens].gapId = wordId;
            tokensForDisplay[selected.originalIndexInTokens].originalWord = selected.token.text;
        }
        
        shuffleArray(chosenWordsForBank); // Shuffle for word bank display order
        return { chosenWords: chosenWordsForBank, allTokens: tokensForDisplay };
    }

    function renderExerciseArea(tokensToDisplay) {
        gappedTextDiv.innerHTML = '';
        tokensToDisplay.forEach(token => {
            if (token.isGap) {
                const gapSpan = document.createElement('span');
                gapSpan.classList.add('gap');
                gapSpan.textContent = '________';
                gapSpan.dataset.gapId = token.gapId;
                gapSpan.dataset.originalWord = token.originalWord;
                
                gapSpan.addEventListener('dragover', handleDragOver);
                gapSpan.addEventListener('dragleave', handleDragLeave);
                gapSpan.addEventListener('drop', handleDrop);
                gappedTextDiv.appendChild(gapSpan);
            } else {
                gappedTextDiv.appendChild(document.createTextNode(token.text));
            }
        });
    }

    function renderWordBank(wordsForBank) {
        wordBankDiv.innerHTML = '';
        wordsForBank.forEach(wordInfo => {
            const wordItem = document.createElement('div');
            wordItem.classList.add('word-bank-item');
            wordItem.textContent = wordInfo.text;
            wordItem.draggable = true;
            wordItem.dataset.wordId = wordInfo.id;
            wordItem.dataset.wordText = wordInfo.text; // Store text for drop
            
            wordItem.addEventListener('dragstart', handleDragStart);
            wordBankDiv.appendChild(wordItem);
        });
    }

    function createExercise() {
        originalText = textInput.value.trim();
        const numToReplace = parseInt(numWordsInput.value);

        if (!originalText) {
            showMessage('Please enter some text.', 'error');
            return;
        }
        if (isNaN(numToReplace) || numToReplace < 1) {
            showMessage('Please enter a valid number of words to replace (at least 1).', 'error');
            return;
        }

        const allInputTokens = tokenizeText(originalText);
        const wordCount = allInputTokens.filter(t => t.type === 'word').length;
        if (numToReplace > wordCount) {
            showMessage(`Number of words to replace (${numToReplace}) exceeds available words (${wordCount}). Adjusting to ${wordCount}.`, 'info');
            numWordsInput.value = wordCount;
            if (wordCount === 0) {
                 showMessage('No words in text to replace.', 'error');
                 return;
            }
        }


        const result = selectWordsToReplace(allInputTokens, Math.min(numToReplace, wordCount));
        if (!result) return; // Error handled in selectWordsToReplace

        currentChosenWords = result.chosenWords;
        currentTokens = result.allTokens;

        renderExerciseArea(currentTokens);
        renderWordBank(currentChosenWords);

        exerciseArea.style.display = 'flex';
        btnRestartExercise.style.display = 'inline-block';
        showMessage('Exercise created! Drag words from the bank to the gaps.', 'success');
        updateView(); // Apply web view if active
    }

    function restartExercise() {
        if (!originalText) {
            showMessage('No exercise to restart. Create one first.', 'error');
            return;
        }
        const numToReplace = parseInt(numWordsInput.value); // Use current value
         const allInputTokens = tokenizeText(originalText);
        const wordCount = allInputTokens.filter(t => t.type === 'word').length;

        const result = selectWordsToReplace(allInputTokens, Math.min(numToReplace, wordCount));
        if (!result) return;


        currentChosenWords = result.chosenWords;
        currentTokens = result.allTokens;
        
        renderExerciseArea(currentTokens);
        renderWordBank(currentChosenWords);
        showMessage('Exercise restarted with new gaps.', 'info');
    }

    function restartApplication() {
        originalText = '';
        currentTokens = [];
        currentChosenWords = [];
        
        textInput.value = '';
        numWordsInput.value = '5';
        
        gappedTextDiv.innerHTML = '';
        wordBankDiv.innerHTML = '';
        
        exerciseArea.style.display = 'none';
        btnRestartExercise.style.display = 'none';
        
        isWebView = false; // Default to setup view
        updateView();
        showMessage('Application restarted.', 'info');
    }
    
    function toggleWebView() {
        isWebView = !isWebView;
        updateView();
    }

    function updateView() {
        if (isWebView) {
            setupPanel.style.display = 'none';
            btnCreate.style.display = 'none';
            btnToggleView.textContent = 'Show Setup';
            // Exercise area visibility depends on whether an exercise has been created
            if (originalText) {
                exerciseArea.style.display = 'flex';
            }
        } else {
            setupPanel.style.display = 'block';
            btnCreate.style.display = 'inline-block';
            btnToggleView.textContent = 'Show on Web Page';
            // Exercise area remains visible if an exercise exists
             if (originalText) {
                exerciseArea.style.display = 'flex';
            }
        }
    }

    // Drag and Drop Handlers
    function handleDragStart(event) {
        event.dataTransfer.setData('text/plain', event.target.dataset.wordText);
        event.dataTransfer.setData('word-id', event.target.dataset.wordId);
        // Optional: style the dragged item
        setTimeout(() => event.target.classList.add('dragging'), 0);
    }

    function handleDragOver(event) {
        event.preventDefault(); // Necessary to allow drop
        if (event.target.classList.contains('gap') && !event.target.dataset.filled) {
             event.target.classList.add('drag-over');
        }
    }
    
    function handleDragLeave(event) {
        if (event.target.classList.contains('gap')) {
            event.target.classList.remove('drag-over');
        }
    }

    function handleDrop(event) {
        event.preventDefault();
        const gapElement = event.target;
        gapElement.classList.remove('drag-over');

        if (gapElement.classList.contains('gap') && !gapElement.dataset.filled) {
            const draggedWordText = event.dataTransfer.getData('text/plain');
            const draggedWordId = event.dataTransfer.getData('word-id');

            // Allow drop only if the word ID matches the gap ID (strict)
            if (gapElement.dataset.gapId === draggedWordId) {
                gapElement.textContent = draggedWordText;
                gapElement.classList.add('filled');
                gapElement.dataset.filled = "true";

                // Mark word in bank as used
                const wordBankItem = wordBankDiv.querySelector(`.word-bank-item[data-word-id="${draggedWordId}"]`);
                if (wordBankItem) {
                    wordBankItem.classList.add('used');
                    wordBankItem.draggable = false; // Prevent re-dragging
                }
                checkAllGapsFilled();
            } else {
                 showMessage('That word doesn\'t belong in this gap. Try another one.', 'error');
            }
        }
         // Clean up dragging class from source
        const draggingElement = document.querySelector('.word-bank-item.dragging');
        if (draggingElement) {
            draggingElement.classList.remove('dragging');
        }
    }
    
    function checkAllGapsFilled() {
        const allGaps = gappedTextDiv.querySelectorAll('.gap');
        const allFilled = Array.from(allGaps).every(gap => gap.classList.contains('filled'));
        if (allFilled && allGaps.length > 0) {
            showMessage('Congratulations! You filled all the gaps correctly!', 'success');
        }
    }

    // Initialize view
    updateView();
});

