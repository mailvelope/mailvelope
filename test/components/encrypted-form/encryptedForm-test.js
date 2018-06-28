import EncryptedForm from '../../../src/components/encrypted-form/encryptedForm';
import Enzyme from 'enzyme';
import FormSandbox from '../../../src/components/encrypted-form/components/FormSandbox';
import mvelo from '../../../src/lib/lib-mvelo';
import React from 'react';
import Spinner from "../../../src/components/util/Spinner";
import * as l10n from '../../../src/lib/l10n';

const mockPort = function () {
    const portMock = {
        _events: {
            emit: [],
            on: [],
            send: []
        },
        on: (event) => portMock._events.on.push(event),
        emit: (event) => portMock._events.emit.push(event),
        send: (event) => {
            portMock._events.send.push(event);
            return new Promise((resolve, reject) => {
                resolve(event);
            });
        }
    };
    sinon.stub(mvelo.EventHandler, 'connect').returns(portMock);
};

describe('Encrypt Form unit tests', () => {

    beforeEach(() => {
        mockPort();
    });

    afterEach(() => {
        mvelo.EventHandler.connect.restore();
    });

    it('should initialize the component and should wait on the form definition event', () => {
        const wrapper = Enzyme.mount(<EncryptedForm id="encrypted-form-test"/>);
        const component = wrapper.instance();
        expect(component.port._events.on).to.include.members(['encrypted-form-definition', 'error-message',
            'terminate', 'encrypted-form-submit', 'encrypted-form-submit-cancel']);
        expect(component.port._events.emit).to.include.members(['encrypted-form-init']);
        expect(wrapper.containsMatchingElement(<Spinner />)).to.equal(true);
    });

    it('should show the sandbox form component and the form materials', () => {
        const wrapper = Enzyme.mount(<EncryptedForm id="encrypted-form-test" />);
        const component = wrapper.instance();
        const event = {
            formDefinition: '<form class="needs-validation" data-recipient="test@mailvelope.com" data-action="https://demo.mailvelope.com/form/"><div class="form-group"><label for="validationCustomSimple">How are you?</label><div class="input-group"><input class="form-control" value="cofveve" name="validationCustomSimple" required="" type="text" id="validationCustomSimple"><div class="invalid-feedback">Please say something?</div></div></div></form>',
            formEncoding: 'html',
            formAction: null,
            formRecipient: 'test@mailvelope.com',
            formFingerprint: 'AA1E 0177 4BDF 7D76 A45B DC2D F11D B125 0C3C 3F1B'
        };
        component.showForm(event);
        wrapper.update();

        expect(wrapper.find('iframe#formSandbox').exists()).to.equal(true);
        expect(wrapper.find('.formWrapper').exists()).to.equal(true);
        expect(wrapper.find('button.btn').exists()).to.equal(true);
    });

});
