import sinon from 'sinon';
import chai, {expect} from 'chai';
import chaiAsPromised from 'chai-as-promised';
import chaiDom from 'chai-dom';

import {configure as configureRTL, render, screen, fireEvent, waitFor, act} from '@testing-library/react';
import userEvent from '@testing-library/user-event';

chai.use(chaiAsPromised);
chai.use(chaiDom);

// Configure RTL to use custom test id attribute
configureRTL({
  testIdAttribute: 'data-testid'
});

export {expect, sinon};
// Export React Testing Library methods
export {render, screen, fireEvent, waitFor, act, userEvent};
