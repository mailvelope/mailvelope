
import chaiAsPromised from 'chai-as-promised';
chai.use(chaiAsPromised);

/* eslint no-unused-vars: off */
const expect = chai.expect;

import './mvelo-test';
import './app/settings/keyserver-test';
import './components/editor/editor-test';
import './components/editor/recipient-input-test';
import './content-scripts/encryptFrame-test';
import './content-scripts/providerSpecific-test';
import './controller/editor.controller-test';
import './controller/encrypt.controller-test';
import './controller/sub.controller-test';
import './controller/encryptedForm.controller-test';
import './modules/keyring-test';
import './modules/keyserver-test';
