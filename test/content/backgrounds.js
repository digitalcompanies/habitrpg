import {
  expectValidTranslationString,
  describeEachItem
} from '../helpers/content.helper';
import {each} from 'lodash';

import backgroundSets from '../../common/script/src/content/backgrounds';
import backgrounds from '../../common/script/content/appearance/backgrounds';

describe('Background Sets', () => {
  each(backgroundSets, (set, name) => {
    describeEachItem(name, set, (bg, key) => {
      it('has a valid text attribute', () => {
        expectValidTranslationString(bg.text);
      });

      it('has a valid notes attribute', () => {
        expectValidTranslationString(bg.notes);
      });
    });
  });
});

describe('Individual Backgrounds', () => {
  each(backgrounds, (background, name) => {
    describeEachItem(name, background, (bg, key) => {
      it('has a valid text attribute', () => {
        expectValidTranslationString(bg.text);
      });

      it('has a valid notes attribute', () => {
        expectValidTranslationString(bg.notes);
      });

      it('has a valid price attribute', () => {
        expect(bg.price).to.be.a('number');
      });
    });
  });
});

