import sinon from 'sinon';
import chai, {expect} from 'chai';
import Adapter from 'enzyme-adapter-react-16';
import chaiEnzyme from 'chai-enzyme';
import chaiAsPromised from 'chai-as-promised';

import {configure} from 'enzyme';

chai.use(chaiEnzyme());
chai.use(chaiAsPromised);
configure({adapter: new Adapter()});

export {expect, sinon};
export * from 'enzyme';
