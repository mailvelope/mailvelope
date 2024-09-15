import React from 'react';
import {shallow, sinon, expect} from 'test';
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
      const wrapper = shallow(<RecipientInput {...props} />);
      expect(wrapper.exists()).to.be.true;
    });
  });
});
