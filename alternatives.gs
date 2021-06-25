/*
This file contains functions that were considered for use in the add-on but ultimately not used. 
*/

function processWords(words) {
  let frequency = {};
  let word = "";
  let first_letter = 0;
  let ender = new Set(["!", ".", "?"]);
  let punctuation = new Set(['!',"\"",'\'','#','$','%','&','\'','(',')','*','+',',','-','.','/',':',';','<','=','>','?','@','[',']','^','_','`','{','|','}','~']);
  let sentence_count = 0;
  let lw_count = 0;
  let syllableRegex = new RegExp('[aiouy]+e*|e(?!d$|ly).|[td]ed|le$', 'g');
  let syl_count = 0;
  let polysyl_count = 0;
  for(let i = 0; i < words.length; i++) {
    word = words[i].trim().toLowerCase().replace("\n", "");
    while(punctuation.has(word.charAt(0)) || punctuation.has(word.slice(-1))) {
      if(punctuation.has(word.charAt(0))) {
        word = word.slice(1);
      } else {
        ender.has(word.slice(-1)) ? sentence_count++ : 0;
        word = word.slice(0, -1);
      }
    }
    first_letter = word.charCodeAt(0);
    lw_count = word.length > 6 ? ++lw_count : lw_count;
    let word_syl_count = word.match(syllableRegex) ? word.match(syllableRegex).length : 0;
    syl_count += word_syl_count;
    polysyl_count = word_syl_count > 3 ? ++polysyl_count : polysyl_count;
    if(first_letter >= 97 && first_letter <= 122) {
      frequency[word] = frequency[word] == undefined ? 1 : ++frequency[word];
    }
  }
  return {
    freq: frequency,
    sentences: sentence_count,
    syllables: syl_count,
    polysyl: polysyl_count,
    long_words: lw_count
  }
}

function altProcessWords(text) {
  /*
  Optional API for more readability metrics
  */
  let response = UrlFetchApp.fetch("https://ipeirotis-readability-metrics.p.rapidapi.com/getReadabilityMetrics", {
    method: "post",
    payload: {
      "text": text
    },
    headers: {
		"x-rapidapi-key": "c421583054msh907949f35bb864bp1921bejsnc19f0e4c7eeb",
		"x-rapidapi-host": "ipeirotis-readability-metrics.p.rapidapi.com"
	}
  }).getContentText();
  return JSON.parse(response);
}


function getFreq(text) {
  let corpus = getCorpus();
  let results = {
    lt_500: 0,
    bt_500_3000: 0,
    gt_3000: 0
  }
  let reg = new RegExp(/([\n\t"“”,.?!])+/g)
  let words = text.toLowerCase().replace(reg, "").split(" ");
  let long_words = 0;
  let count = words.length;
  words.forEach((word) => {
    let temp = word.toLowerCase();
    temp.length > 6 ? long_words++ : 0;
    let test = corpus[temp];
    if(test) {
      if(test <= 500) {
        results.lt_500++;
      } else if (test > 500 && test <= 3000) {
        results.bt_500_3000++;
      } else {
        results.gt_3000++;
      }
    }
  })
  Object.keys(results).forEach((key) => results[key] /= count);
  results["long_words"] = long_words;
  return results;
}


function getDoc() {
  let text = getDocText();
  let process_result = altProcessWords(text);
  let freq_result = getFreq(text);
  let essentials = new Set(["WORDS", "SYLLABLES", "CHARACTERS", "COMPLEXWORDS", "SENTENCES"]);
  let process_refined = {};
  let essentials_obj = {};
  Object.keys(process_result).forEach((key) => {
    if(essentials.has(key)) {
      essentials_obj[key] = process_result[key];
    } else {
      process_refined[key] = process_result[key];
    }
  });

  // other metrics
  process_refined["RIX"] = freq_result.long_words / process_result["SENTENCES"];
  essentials_obj["READ_TIME_MINS"] = (process_result["WORDS"] / 250).toFixed(2); 
  let linsear = ((process_result["WORDS"] - process_result["COMPLEXWORDS"]) + 3 * process_result["COMPLEXWORDS"]) / process_result["SENTENCES"];
  linsear = linsear > 20 ? linsear / 2 : (linsear / 2) - 1;
  process_refined["LINSEAR"] = linsear;
  
  let output = {
    raw_text: text,
    metrics: process_refined,
    corpus: freq_result,
    essentials: essentials_obj
  }
  return output;
}