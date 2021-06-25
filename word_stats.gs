// @ts-nocheck
/**
 * @OnlyCurrentDoc
 *
 * The above comment directs Apps Script to limit the scope of file
 * access for this add-on. It specifies that this add-on will only
 * attempt to read or modify the files in which the add-on is used,
 * and not all of the user's files. The authorization request message
 * presented to users will reflect this limited scope.
 */

/**
 * Creates a menu entry in the Google Docs UI when the document is opened.
 * This method is only used by the regular add-on, and is never called by
 * the mobile add-on version.
 *
 * @param {object} e The event parameter for a simple onOpen trigger. To
 *     determine which authorization mode (ScriptApp.AuthMode) the trigger is
 *     running in, inspect e.authMode.
 */
function onOpen(e) {
  DocumentApp.getUi().createAddonMenu()
      .addItem('Start', 'showSidebar')
      .addToUi();
}
/**
 * Runs when the add-on is installed.
 * This method is only used by the regular add-on, and is never called by
 * the mobile add-on version.
 *
 * @param {object} e The event parameter for a simple onInstall trigger. To
 *     determine which authorization mode (ScriptApp.AuthMode) the trigger is
 *     running in, inspect e.authMode. (In practice, onInstall triggers always
 *     run in AuthMode.FULL, but onOpen triggers may be AuthMode.LIMITED or
 *     AuthMode.NONE.)
 */
function onInstall(e) {
  onOpen(e);
}


/**
 * Opens a sidebar in the document containing the add-on's user interface.
 * This method is only used by the regular add-on, and is never called by
 * the mobile add-on version.
 */
function showSidebar() {
  var ui = HtmlService.createHtmlOutputFromFile('index')
      .setTitle('UNC MTC Simplifier');
  DocumentApp.getUi().showSidebar(ui);
}

/** 
 * This is the critical function of our program. It utilizes all the other functions to create an output object that is
 * returned to the frontend.
*/
function processDocument() {
  // process the document.
  let body = DocumentApp.getActiveDocument().getBody();
  let bodyText = body.editAsText();
  let text = body.editAsText().getText();

  // store all distinct words found in the doc
  let wordList = {};

  let words = getWords(text);
  let totalWords = words.length;
  let sentences = getSentences(text);
  let totalSentences = sentences.length;
  let totalSyllables = getNumSyllables(text);

  let avgSentenceLength = totalWords / totalSentences;
  let avgSyllablesWord = totalSyllables / totalWords;

  // count the number of distinct words
  words.forEach((word) => {
    if(!wordList[word]) {
      wordList[word] = 1;
    }
  })

  let distinctWords = Object.keys(wordList).length;

  let freqResult = getFrequencies(bodyText, words);

  underlineSentences(bodyText, sentences);

  let kincaid = 0.39 * (avgSentenceLength) + 11.8 * (avgSyllablesWord) - 15.59;

  let reading = 206.835 - 1.015 * (avgSentenceLength) - 84.6 * (avgSyllablesWord);

  let output = {
    word_count: totalWords,
    original_doc: text,
    sentence_count: totalSentences,
    syllable_count: totalSyllables,
    syllables_word: avgSyllablesWord,
    flesch_kincaid: kincaid,
    flesch_reading: reading,
    type_token: distinctWords / totalWords,
    frequencies: freqResult.frequency,
    avg_sentence: avgSentenceLength
  }
  return output;

  // optional code for testing
  
}

/**
 * Resets the bold and underlined formatting of the document. This function is called by the frontend
 * when our app is first loaded.
 */
function formatReset() {
  DocumentApp.getActiveDocument().getBody().editAsText().setBold(false).setUnderline(false);
}

/**
 * Underlines sentences that are longer than 10 words.
 * 
 * 
 * @param {Text} bodyText This is the text object that represents the text in the body of the document.
 * We use this to underline sentences that are longer than 10 words.
 * 
 * @param {String[]} sentences This is an array of Strings representing all the sentences in the document.
 * We use this to find the number of words in a sentence and to determine whether it needs to be underlined.
 *  
 */
function underlineSentences(bodyText, sentences) {
  let text = bodyText.getText();
  let sentenceWordLimit = 11;
  let pos = 0;
  sentences.forEach((sentence) => {
    let match = text.indexOf(sentence, pos);
    let sentence_length = sentence.split(" ").length;
    if(match != -1 && sentence_length > sentenceWordLimit) {
      !bodyText.isUnderline(match) ? bodyText.setUnderline(match, match + sentence.length - 1, true) : 1;
    } else if (match != -1 && sentence_length <= sentenceWordLimit) {
      bodyText.isUnderline(match) ? bodyText.setUnderline(match, match + sentence.length - 1, false) : 0;
    }
    pos = match + sentence.length - 1
  })
}

/**
 * Computes Word Frequencies
 * 
 * 
 * @param {Text} bodyText This is the text object that represents the text in the body of the document.
 * We use this to get the String version of the text in the document and to subsequently bold words that
 * are outside the top 3000 words in the English language.
 * 
 * @param {String[]} words This is an array of Strings representing all the words in the document.
 * We use this locate words in the document that are outside the top 3000 in the English language.
 *  
 */
function getFrequencies(bodyText, words) {
  let corpus = getCorpus();
  let results = {};
  let text = bodyText.getText().toLowerCase();

  // stores results of word frequency range count
  let frequency = {
    lt500: 0,
    lt3000: 0,
    gt3000: 0,
  }

  let pos = 0;
  let match = 0;
  let lt3000_flag = 0;
  let no_flag = 0;
  let contraction_flag = 0;
  let red = "#ff0000";

  // go through each word in the document
  words.forEach((word) => {
    lt3000_flag = 0;
    
    // account for contractions
    contraction_flag = 0;
    if(word.includes("‘") || word.includes("’")) {
      if(!word.includes("‘s") || !word.includes("’s")){
        contraction_flag = 1;
      }
    }

    // account for negative words such as no & not
    no_flag = 0;
    if(word == "no" || word == "not") {
      no_flag = 1;
    }

    match = text.indexOf(word, pos)
    if(word.length <= 4 || corpus[word] <= 500) {
      frequency.lt500++;
      lt3000_flag = 1;
    } else if (corpus[word] <= 3000) {
      frequency.lt3000++;
      lt3000_flag = 1;
    } else {
      frequency.gt3000++;
    }
    if(match != -1) {
      if(lt3000_flag) {
        bodyText.isBold(match) ? bodyText.setBold(match, match + word.length - 1, false) : 0
        pos = match != -1 ? match + word.length : pos
      } else {
        bodyText.isBold(match) ? 1 : bodyText.setBold(match, match + word.length - 1, true);
        pos = match != -1 ? match + word.length : pos
      }

      if((no_flag || contraction_flag) && bodyText.getForegroundColor(match) != red){
        bodyText.setForegroundColor(match, match + word.length - 1, red);
      }
    }
  })
  results["frequency"] = frequency;
  return results;
}

/**
 * Split based on the spaces to get the words in the document.
 * 
 * @param {String} text This is the text of the document in String form.
 * 
 */
function getWords(text) {
  return text.match(/[A-Za-z‘’]+/g).map((word) => word.toLowerCase());
}


/** 
 * Look for ending punctuation to find number of sentences.
 * 
 * @param {String} text This is the text of the document in String form.
 *  
*/
function getSentences(text) {
  let sentenceRegex = new RegExp(/([^.?!])+/g);
  return text.match(sentenceRegex).filter((str) => str.length > 5);
}

/** 
 * Finding the number of syllables in the document.
 * 
 * Syllable Regex from: https://www.simoahava.com/analytics/calculate-readability-scores-for-content/
 * 
 * @param {String} text This is the text of the document in String form.
 *  
*/
function getNumSyllables(text) {
  let syllableRegex = new RegExp('[aiouy]+e*|e(?!d$|ly).|[td]ed|le$', 'g');
  return text.match(syllableRegex).length;
}

/** 
 * Returns the text of the document in String form.
*/
function getDocument() {
  return DocumentApp.getActiveDocument().getBody().getText();
}

