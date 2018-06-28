import Adapter from 'enzyme-adapter-react-16'
import chaiAsPromised from 'chai-as-promised';
import Enzyme from 'enzyme';

chai.use(chaiAsPromised);
Enzyme.configure({ adapter: new Adapter() });

/* eslint no-unused-vars: off */
const expect = chai.expect;

import './mvelo-test';
import './app/settings/keyserver-test';
import './components/editor/editor-test';
import './components/editor/recipient-input-test';
import './components/encrypted-form/encryptedForm-test';
import './content-scripts/encryptFrame-test';
import './content-scripts/providerSpecific-test';
import './controller/editor.controller-test';
import './controller/encrypt.controller-test';
import './controller/sub.controller-test';
import './controller/encryptedForm.controller-test';
import './modules/keyring-test';
import './modules/keyserver-test';
