import React from 'react';
import {render, expect, sinon} from 'test';
import {RecipientInput} from 'components/editor/components/RecipientInput';

describe('RecipientInput component', () => {
  let props;

  beforeEach(() => {
    props = {
      extraKey: false,
      hideErrorMsg: false,
      keys: [],
      onAutoLocate: sinon.spy(),
      onChangeRecipients: sinon.spy(),
      recipients: [],
    };
  });

  describe('initial state', () => {
    it('should render without errors', () => {
      const {container} = render(<RecipientInput {...props} />);
      expect(container.firstChild).to.exist;
    });
  });
});
