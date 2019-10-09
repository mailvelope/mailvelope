/**
 * Copyright (C) 2015-2019 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import {DISPLAY_INLINE, DISPLAY_POPUP} from '../lib/constants';
import ExtractFrame from './extractFrame';
import * as l10n from '../lib/l10n';
import {deDup} from '../lib/util';
import {prefs} from './main';

l10n.register([
  'verify_frame_help_text'
]);

l10n.mapToLocal();

const PGP_SIG_HEADER = /-----BEGIN\sPGP\sSIGNATURE/;

export default class VerifyFrame extends ExtractFrame {
  constructor() {
    super();
    this.pgpSigRange = null;
    this.vDialog = null;
    // verify popup active
    this.vPopup = false;
    this.ctrlName = `vFrame-${this.id}`;
  }

  init(pgpRange) {
    super.init(pgpRange);
    this.calcSignatureHeight();
  }

  calcSignatureHeight() {
    const treeWalker = document.createTreeWalker(this.pgpElement, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (PGP_SIG_HEADER.test(node.textContent)) {
          return NodeFilter.FILTER_ACCEPT;
        }
        return NodeFilter.FILTER_REJECT;
      }
    }, false);
    const pgpSigBegin = treeWalker.nextNode();
    this.pgpSigRange = pgpSigBegin.ownerDocument.createRange();
    this.pgpSigRange.setStart(pgpSigBegin, pgpSigBegin.data.search(PGP_SIG_HEADER));
    this.pgpSigRange.setEnd(this.pgpRange.endContainer, this.pgpRange.endOffset);
  }

  renderFrame() {
    super.renderFrame();
    const para = document.createElement('p');
    para.textContent = l10n.map.verify_frame_help_text;
    this.eFrame.append(para);
    this.eFrame.classList.add('m-verify');
    this.eFrame.classList.remove('m-large');
  }

  registerEventListener() {
    super.registerEventListener();
    this.port.on('remove-dialog', this.removeDialog);
    this.port.on('armored-message', this.onArmoredMessage);
  }

  clickHandler(ev) {
    super.clickHandler(undefined, ev);
    if (prefs.security.display_decrypted == DISPLAY_POPUP) {
      this.popupDialog();
    }
  }

  async onArmoredMessage() {
    let sender = await this.getEmailSender();
    sender = sender.map(person => person.email);
    sender = deDup(sender);
    this.port.emit('vframe-armored-message', {data: this.getArmoredMessage(), sender});
  }

  onShow() {
    super.onShow();
    if (prefs.security.display_decrypted == DISPLAY_INLINE && !this.vDialog) {
      this.inlineDialog();
    }
  }

  inlineDialog() {
    this.vDialog = document.createElement('iframe');
    this.vDialog.id = `vDialog-${this.id}`;
    this.vDialog.src = chrome.runtime.getURL(`components/decrypt-message/decryptMessage.html?id=${this.id}`);
    this.vDialog.frameBorder = 0;
    this.vDialog.scrolling = 'no';
    this.vDialog.classList.add('m-frame-dialog');
    this.eFrame.append(this.vDialog);
    this.setFrameDim();
    this.vDialog.classList.add('m-show');
  }

  popupDialog() {
    this.port.emit('vframe-display-popup');
    this.vPopup = true;
  }

  removeDialog() {
    // check if dialog is active
    if (!this.vPopup) {
      return;
    }
    this.vPopup = false;
    this.eFrame.classList.add('m-cursor');
    this.eFrame.classList.remove('m-open');
    this.eFrame.addEventListener('click', this.clickHandler);
  }

  setFrameDim() {
    let width;
    let height;
    this.eFrame.style.bottom = 0;
    if (this.vDialog) {
      ({height} = this.pgpRange.getBoundingClientRect());
      ({width} = this.pgpElement.parentElement.getBoundingClientRect());
      // less 1px border and 2 pixel box-shadow
      width -= 3;
      this.vDialog.style.width = `${width}px`;
      this.vDialog.style.height = `${height}px`;
    } else {
      ({height} = this.pgpSigRange.getBoundingClientRect());
      ({width} = this.pgpRange.getBoundingClientRect());
    }
    this.eFrame.style.width = `${width}px`;
    this.eFrame.style.height = `${height}px`;
  }
}
