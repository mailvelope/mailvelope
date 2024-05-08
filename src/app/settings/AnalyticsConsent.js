/**
 * Copyright (C) 2024 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import PropTypes from 'prop-types';
import * as l10n from '../../lib/l10n';
import {ONBOARDING_CAMPAIGN} from '../../lib/analytics';
import {port} from '../app';
import {useHistory} from 'react-router-dom';
import Modal from '../../components/util/Modal';

l10n.register([
  'analytics_interstitial_header',
  'analytics_consent_interstitial_message',
  'analytics_consent_interstitial_learn_more',
  'analytics_consent_interstitial_learn_more_explanation',
  'analytics_consent_interstitial_We_Collect_Minimal_Data_Title',
  'analytics_consent_interstitial_We_Collect_Minimal_Data',
  'analytics_consent_interstitial_We_Respect_your_Choice_Title',
  'analytics_consent_interstitial_We_Respect_your_Choice',
  'analytics_consent_interstitial_Your_Privacy_is_Preserved_Title',
  'analytics_consent_interstitial_Your_Privacy_is_Preserved_Pt1',
  'analytics_consent_interstitial_Your_Privacy_is_Preserved_Pt2',
  'analytics_consent_interstitial_Faq',
  'analytics_consent_interstitial_Btn_Learn_More',
  'dialog_no_button',
  'dialog_yes_button',
  'header_analyticsconsent_modal',
  'paragraph_analyticsconsent_modal',
  'button_analyticsconsent_modal'
]);

function withHistory(Component) {
  return function WrapperComponent(props) {
    const history = useHistory();
    return <Component {...props} history={history} />;
  };
}

class AnalyticsConsent extends React.Component {
  constructor(props) {
    super(props);
    this.handleSelection = this.handleSelection.bind(this);
    this.toggleExpansion = this.toggleExpansion.bind(this);
    this.toggleModal = this.toggleModal.bind(this);
    this.state = {
      expanded: false,
      showModal: false,
    };
  }

  handleSelection(event) {
    const consented = event.target.getAttribute('data-selection') === 'yes';
    if (consented) {
      port.emit('grant-consent', {campaignId: ONBOARDING_CAMPAIGN});
    } else {
      port.emit('deny-consent', {campaignId: ONBOARDING_CAMPAIGN});
    }
    this.props.history.push('/keyring');
  }

  toggleExpansion() {
    this.setState(prevState => ({expanded: !prevState.expanded}));
  }

  toggleModal() {
    this.setState(prevState => ({showModal: !prevState.showModal}));
  }

  render() {
    return (
      <div className="jumbotron">
        <Modal className="text-center mt-5" isOpen={this.state.showModal} onHide={this.toggleModal} hideHeader={true} hideFooter={true}>
          <img className="img-fluid my-4" src="/img/ic_thankyou.svg" />
          <h2 className="">{l10n.map.header_analyticsconsent_modal}</h2>
          <p className="">{l10n.map.paragraph_analyticsconsent_modal}</p>
          <button className="btn btn-consent mb-4 " type="button" data-selection="yes" onClick={this.handleSelection}>{l10n.map.button_analyticsconsent_modal}</button>
        </Modal>
        <section className="card text-center">
          <div className="container">
            <div className="row justify-content-center">
              <div className="round-container my-4 d-flex justify-content-center align-items-center">
                <img className="img-fluid" src="/img/hands.svg" />
              </div>
            </div>
          </div>
          <div className="container">
            <div className="row justify-content-center">
              <div className="col-md-12 mt-2">
                <h2 className="text-center">{l10n.map.analytics_interstitial_header}</h2>
              </div>
              <div className="col-md-12 my-2 d-flex justify-content-center">
                <p className="text-center w-50 mx-2">{l10n.map.analytics_consent_interstitial_message}</p>
              </div>
              <button className="btn btn-consent mx-2" type="button" data-selection="no" onClick={this.handleSelection}>{l10n.map.dialog_no_btn}</button>
              <button className="btn btn-consent mx-2" type="button" data-selection="yes" onClick={this.toggleModal}>{l10n.map.dialog_yes_btn}</button>
            </div>
          </div>
          <p className="accordion-control my-4" onClick={this.toggleExpansion}>{l10n.map.analytics_consent_interstitial_learn_more} <span className="collapse-icon"><img className="img-fluid" src="/img/arrow.svg" /></span></p>
          <div id="learnhow" className={`collapse my-4 ${this.state.expanded ? 'show mx-5' : ''}`} >
            <div className="row mx-5">
              <div className="col-md-1">
                <span className="collapse-icon"><img className="img-fluid w-100" src="/img/minimaldata.svg" /></span>
              </div>
              <div className="col-md-5 text-left">
                <p className="font-weight-bold  mb-0">{l10n.map.analytics_consent_interstitial_We_Collect_Minimal_Data_Title}</p>
                <p className="text-left">{l10n.map.analytics_consent_interstitial_We_Collect_Minimal_Data}</p>
              </div>
              <div className="col-md-1">
                <span className="collapse-icon"><img className="img-fluid w-100" src="/img/respectChoise.svg" /></span>
              </div>
              <div className="col-md-5 text-left">
                <p className="font-weight-bold  mb-0">{l10n.map.analytics_consent_interstitial_We_Respect_your_Choice_Title}</p>
                <p className="text-left">{l10n.map.analytics_consent_interstitial_We_Respect_your_Choice}</p>
              </div>
              <div className="col-md-1">
                <span className="collapse-icon"><img className="img-fluid w-100" src="/img/privacyReserved.svg" /></span>
              </div>
              <div className="col-md-5 text-left">
                <p className="font-weight-bold  mb-0">{l10n.map.analytics_consent_interstitial_Your_Privacy_is_Preserved_Title}</p>
                <p className="">{l10n.map.analytics_consent_interstitial_Your_Privacy_is_Preserved_Pt1} <a href="https://cleaninsights.org/" target="_blank" rel="noopener noreferrer">Clean Insights</a> {l10n.map.analytics_consent_interstitial_Your_Privacy_is_Preserved_Pt2}</p>
              </div>
              <div className="col-md-1">
                <span className="collapse-icon"><img className="img-fluid w-100" src="/img/faqInfo.svg" /></span>
              </div>
              <div className="col-md-5 text-left">
                <p className="">{l10n.map.analytics_consent_interstitial_Faq}</p>
                <a className="btn btn-consent" href="https://mailvelope.com/faq#analytics" target="_blank" rel="noopener noreferrer" role="button">{l10n.map.analytics_consent_interstitial_Btn_Learn_More}</a>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }
}

AnalyticsConsent.propTypes = {
  history: PropTypes.object,
};

export default withHistory(AnalyticsConsent);
