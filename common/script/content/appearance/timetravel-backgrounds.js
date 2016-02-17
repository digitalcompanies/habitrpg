import {forOwn} from 'lodash';
let t = require('../translation.js');

/* eslint-disable camelcase */
let timeTravelBackgrounds = {
  backgrounds023016: {
    steampunk_one: {
      text: t('backgroundSteampunkOneText'),
      notes: t('backgroundSteampunkOneNotes'),
    },
    steampunk_two: {
      text: t('backgroundSteampunkTwoText'),
      notes: t('backgroundSteampunkTwoNotes'),
    },
  },
};

forOwn(timeTravelBackgrounds, function prefillBackgroundSet (value) {
  forOwn(value, function prefillTimeTravelBackground (bgObject) {
    bgObject.hourglassPrice = 2;
  });
});

export default timeTravelBackgrounds;
