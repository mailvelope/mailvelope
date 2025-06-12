import React from 'react';
import {render, screen, act, expect, sinon, userEvent} from 'test';
import * as l10n from 'lib/l10n';
import KeyServer from 'app/settings/keyserver';

describe('KeyServer tests', () => {
  const sandbox = sinon.createSandbox();

  const defaultProps = {
    prefs: {
      keyserver: {
        mvelo_tofu_lookup: true,
        wkd_lookup: true,
        autocrypt_lookup: false,
        key_binding: true,
        oks_lookup: true
      }
    },
    onChangePrefs: sandbox.stub().resolves()
  };

  const setup = (props = {}) => {
    const finalProps = {...defaultProps, ...props};
    const ref = React.createRef();
    const rtlUtils = render(<KeyServer ref={ref} {...finalProps} />);
    return {ref, ...rtlUtils};
  };

  before(() => {
    l10n.mapToLocal();
  });

  beforeEach(() => {
    defaultProps.onChangePrefs.resetHistory();
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('should render', () => {
    const {container} = setup();
    expect(container.querySelector('#keyserver')).to.exist;
    expect(container.querySelector('h2')).to.exist;
  });

  describe('Unit tests', () => {
    describe('constructor', () => {
      it('should initialize state with props values', () => {
        const {ref} = setup();
        expect(ref.current.state).to.deep.include({
          mvelo_tofu_lookup: true,
          wkd_lookup: true,
          autocrypt_lookup: false,
          key_binding: true,
          oks_lookup: true,
          modified: false,
          previousPrefs: defaultProps.prefs
        });
      });

      it('should initialize state with defaults when prefs is null', () => {
        const {ref} = setup({prefs: null});
        expect(ref.current.state).to.deep.include({
          mvelo_tofu_lookup: false,
          wkd_lookup: false,
          autocrypt_lookup: false,
          key_binding: false,
          oks_lookup: false,
          modified: false,
          previousPrefs: null
        });
      });
    });

    describe('getDerivedStateFromProps', () => {
      it('should reset state when prefs change', () => {
        const {ref, rerender} = setup();

        // Modify state to be different from props
        act(() => {
          ref.current.setState({mvelo_tofu_lookup: false, modified: true});
        });

        // Change props
        const newProps = {
          ...defaultProps,
          prefs: {
            keyserver: {
              mvelo_tofu_lookup: false,
              wkd_lookup: false,
              autocrypt_lookup: true,
              key_binding: false,
              oks_lookup: false
            }
          }
        };

        rerender(<KeyServer ref={ref} {...newProps} />);

        expect(ref.current.state).to.deep.include({
          mvelo_tofu_lookup: false,
          wkd_lookup: false,
          autocrypt_lookup: true,
          key_binding: false,
          oks_lookup: false,
          modified: false,
          previousPrefs: newProps.prefs
        });
      });

      it('should not reset state when prefs unchanged', () => {
        const {ref} = setup();

        // Modify state
        act(() => {
          ref.current.setState({mvelo_tofu_lookup: false, modified: true});
        });

        const originalState = {...ref.current.state};

        // Re-render with same props
        act(() => {
          ref.current.forceUpdate();
        });

        expect(ref.current.state.modified).to.be.true;
        expect(ref.current.state.mvelo_tofu_lookup).to.equal(originalState.mvelo_tofu_lookup);
      });
    });

    describe('handleCheck', () => {
      it('should update state for checked checkbox', () => {
        const {ref} = setup();
        const event = {target: {name: 'wkd_lookup', checked: true}};

        act(() => {
          ref.current.handleCheck(event);
        });

        expect(ref.current.state.wkd_lookup).to.be.true;
        expect(ref.current.state.modified).to.be.true;
      });

      it('should update state for unchecked checkbox', () => {
        const {ref} = setup();
        const event = {target: {name: 'mvelo_tofu_lookup', checked: false}};

        act(() => {
          ref.current.handleCheck(event);
        });

        expect(ref.current.state.mvelo_tofu_lookup).to.be.false;
        expect(ref.current.state.modified).to.be.true;
      });
    });

    describe('handleSave', () => {
      it('should call onChangePrefs with current state values', async () => {
        const {ref} = setup();

        // Modify some state
        act(() => {
          ref.current.setState({
            autocrypt_lookup: true,
            key_binding: false,
            modified: true
          });
        });

        await act(async () => {
          await ref.current.handleSave();
        });

        expect(defaultProps.onChangePrefs.calledWith({
          keyserver: {
            autocrypt_lookup: true,
            key_binding: false,
            mvelo_tofu_lookup: true,
            oks_lookup: true,
            wkd_lookup: true
          }
        })).to.be.true;
      });

      it('should handle onChangePrefs errors gracefully', async () => {
        const {ref} = setup({
          onChangePrefs: sandbox.stub().rejects(new Error('Save failed'))
        });

        let error;
        try {
          await act(async () => {
            await ref.current.handleSave();
          });
        } catch (e) {
          error = e;
        }

        expect(error).to.be.instanceOf(Error);
        expect(error.message).to.equal('Save failed');
      });
    });
  });

  describe('Integration tests', () => {
    describe('checkbox interactions', () => {
      it('should toggle TOFU lookup checkbox', async () => {
        const user = userEvent.setup();
        const {ref} = setup();

        const checkbox = screen.getByRole('checkbox', {name: /keyserver_tofu_lookup/});
        expect(checkbox).to.be.checked;

        await user.click(checkbox);

        expect(ref.current.state.mvelo_tofu_lookup).to.be.false;
        expect(ref.current.state.modified).to.be.true;
        expect(checkbox).to.not.be.checked;
      });

      it('should toggle WKD lookup checkbox', async () => {
        const user = userEvent.setup();
        const {ref} = setup();

        const checkbox = screen.getByRole('checkbox', {name: /keyserver_wkd_lookup/});
        expect(checkbox).to.be.checked;

        await user.click(checkbox);

        expect(ref.current.state.wkd_lookup).to.be.false;
        expect(ref.current.state.modified).to.be.true;
        expect(checkbox).to.not.be.checked;
      });

      it('should toggle autocrypt lookup checkbox', async () => {
        const user = userEvent.setup();
        const {ref} = setup();

        const checkbox = screen.getByRole('checkbox', {name: /keyserver_autocrypt_lookup/});
        expect(checkbox).to.not.be.checked;

        await user.click(checkbox);

        expect(ref.current.state.autocrypt_lookup).to.be.true;
        expect(ref.current.state.modified).to.be.true;
        expect(checkbox).to.be.checked;
      });

      it('should toggle key binding checkbox', async () => {
        const user = userEvent.setup();
        const {ref} = setup();

        const checkbox = screen.getByRole('checkbox', {name: /keyserver_key_binding_label/});
        expect(checkbox).to.be.checked;

        await user.click(checkbox);

        expect(ref.current.state.key_binding).to.be.false;
        expect(ref.current.state.modified).to.be.true;
        expect(checkbox).to.not.be.checked;
      });

      it('should toggle OKS lookup checkbox', async () => {
        const user = userEvent.setup();
        const {ref} = setup();

        const checkbox = screen.getByRole('checkbox', {name: /keyserver_oks_lookup/});
        expect(checkbox).to.be.checked;

        await user.click(checkbox);

        expect(ref.current.state.oks_lookup).to.be.false;
        expect(ref.current.state.modified).to.be.true;
        expect(checkbox).to.not.be.checked;
      });
    });

    describe('button states and interactions', () => {
      it('should disable save and cancel buttons when not modified', () => {
        setup();

        const saveButton = screen.getByRole('button', {name: /form_save/});
        const cancelButton = screen.getByRole('button', {name: /form_cancel/});

        expect(saveButton).to.have.attribute('disabled');
        expect(cancelButton).to.have.attribute('disabled');
      });

      it('should enable save and cancel buttons when modified', async () => {
        const user = userEvent.setup();
        setup();

        // Make a change to enable buttons
        const checkbox = screen.getByRole('checkbox', {name: /keyserver_tofu_lookup/});
        await user.click(checkbox);

        const saveButton = screen.getByRole('button', {name: /form_save/});
        const cancelButton = screen.getByRole('button', {name: /form_cancel/});

        expect(saveButton).to.not.have.attribute('disabled');
        expect(cancelButton).to.not.have.attribute('disabled');
      });

      it('should call handleSave when save button clicked', async () => {
        const user = userEvent.setup();
        setup();

        // Make a change to enable save button
        const checkbox = screen.getByRole('checkbox', {name: /keyserver_tofu_lookup/});
        await act(async () => {
          await user.click(checkbox);
        });

        const saveButton = screen.getByRole('button', {name: /form_save/});

        await act(async () => {
          await user.click(saveButton);
        });

        expect(defaultProps.onChangePrefs.calledOnce).to.be.true;
      });

      it('should reset state when cancel button clicked', async () => {
        const user = userEvent.setup();
        const {ref} = setup();

        // Make changes
        const tofuCheckbox = screen.getByRole('checkbox', {name: /keyserver_tofu_lookup/});
        const autocryptCheckbox = screen.getByRole('checkbox', {name: /keyserver_autocrypt_lookup/});

        await user.click(tofuCheckbox);
        await user.click(autocryptCheckbox);

        expect(ref.current.state.modified).to.be.true;
        expect(ref.current.state.mvelo_tofu_lookup).to.be.false;
        expect(ref.current.state.autocrypt_lookup).to.be.true;

        // Click cancel to reset
        const cancelButton = screen.getByRole('button', {name: /form_cancel/});
        await user.click(cancelButton);

        expect(ref.current.state.modified).to.be.false;
        expect(ref.current.state.mvelo_tofu_lookup).to.be.true;
        expect(ref.current.state.autocrypt_lookup).to.be.false;
      });
    });

    describe('form sections rendering', () => {
      it('should render verifying servers section', () => {
        setup();
        expect(screen.getByText(l10n.map.keyserver_verifying_servers)).to.exist;
        expect(screen.getByRole('checkbox', {name: /keyserver_tofu_lookup/})).to.exist;
        expect(screen.getByRole('checkbox', {name: /keyserver_oks_lookup/})).to.exist;
      });

      it('should render additional servers section', () => {
        setup();
        expect(screen.getByText(l10n.map.keyserver_additionals_label)).to.exist;
        expect(screen.getByRole('checkbox', {name: /keyserver_wkd_lookup/})).to.exist;
        expect(screen.getByRole('checkbox', {name: /keyserver_autocrypt_lookup/})).to.exist;
      });

      it('should render key binding section', () => {
        setup();
        expect(screen.getByText(l10n.map.keyserver_key_binding_header)).to.exist;
        expect(screen.getByRole('checkbox', {name: /keyserver_key_binding_label/})).to.exist;
      });

      it('should render learn more links', () => {
        const {container} = setup();
        const learnMoreLinks = container.querySelectorAll('a[href*="mailvelope.com/faq"]');
        expect(learnMoreLinks).to.have.length(4);
      });
    });

    describe('error states', () => {
      it('should handle missing prefs gracefully', () => {
        const {ref} = setup({prefs: undefined});
        expect(ref.current.state.mvelo_tofu_lookup).to.be.false;
        expect(ref.current.state.wkd_lookup).to.be.false;
      });

      it('should handle partial prefs object', () => {
        const {ref} = setup({
          prefs: {
            keyserver: {
              mvelo_tofu_lookup: true
              // Missing other properties
            }
          }
        });
        expect(ref.current.state.mvelo_tofu_lookup).to.be.true;
        expect(ref.current.state.wkd_lookup).to.be.undefined;
      });
    });
  });
});
