/**
 * Copyright (C) 2019 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */
import EventHandler from '../lib/EventHandler';
import {getHash, parseHTML} from '../lib/util';
import {FRAME_STATUS, FRAME_ATTACHED, FRAME_DETACHED} from '../lib/constants';
import * as l10n from '../lib/l10n';
import gmailIntegrationCsss from './gmailIntegration.css';
import {isAttached} from './main';

l10n.register([
  'encrypt_frame_btn_label',
  'provider_gmail_secure_reply_btn',
]);

export default class GmailIntegration {
  constructor() {
    this.id = getHash();
    // this.editElement = null;
    // this.eFrame = null;
    this.port = null;
    this.editorBtnRoot = null;
    this.editorBtn = null;
    this.mailIds = [];
    // this.emailTextElement = null;
    // this.currentProvider = currentProvider;
    // this.handleKeypress = this.handleKeypress.bind(this);
    // this.setFrameDim = this.setFrameDim.bind(this);
  }

  init() {
    this.attachEditorBtn();
    this.establishConnection();
    this.registerEventListener();
  }

  attachEditorBtn() {
    this.editorBtnRoot = document.querySelector('.aic');
    if (!this.editorBtnRoot || isAttached(this.editorBtnRoot)) {
      return;
    }
    console.log('Gmail integration: attaching editor button...');
    this.editorBtnRoot.style.overflow = 'hidden';
    const editorBtnContainer = this.editorBtnRoot.querySelector('.z0');
    this.editorBtn = document.createElement('div');
    this.editorBtn.id = `gmailInt-${this.id}`;
    this.editorBtn.classList.add('mv-editor-btn-container');
    const btnElement = `<a id="editorBtn" class="mv-editor-btn" title="${l10n.map.encrypt_frame_btn_label}"><div class="mv-editor-btn-content"><svg width="24px" height="24px" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><g fill="none" fill-rule="evenodd"><circle cx="16" cy="16" r="16" fill="#FF004F"/><path d="M15.995 28.667c-3.39 0-6.57-1.311-8.955-3.691-2.387-2.383-3.704-5.567-3.707-8.966a12.628 12.628 0 0 1 .592-3.836l.007-.028c.087-.306.194-.6.318-.875.022-.055.047-.116.073-.176.11-.251.545-1.115 1.588-1.77.943-.593 1.77-.644 1.866-.648.228-.027.464-.04.699-.04 1.07 0 2.015.423 2.662 1.194.492.587.76 1.307.78 2.097a4.321 4.321 0 0 1 1.959-.481c1.07 0 2.016.424 2.662 1.194.039.046.076.094.113.142.859-.852 1.993-1.336 3.14-1.336 1.07 0 2.015.424 2.662 1.194.656.782.913 1.81.722 2.893l-.672 3.807c-.09.513.017.982.301 1.321.274.327.696.507 1.187.507 1.482 0 2.003-1.08 2.345-2.246.293-1.033.428-2.107.401-3.191a10.675 10.675 0 0 0-3.219-7.387 10.683 10.683 0 0 0-7.445-3.086H16c-2.14 0-4.209.63-5.982 1.825a.97.97 0 0 1-.544.167.958.958 0 0 1-.729-.335L8.74 6.91a.96.96 0 0 1 .196-1.418 12.585 12.585 0 0 1 7.317-2.156 12.604 12.604 0 0 1 8.65 3.67 12.601 12.601 0 0 1 3.758 8.612 12.664 12.664 0 0 1-.41 3.606h.001l-.043.158-.019.063a12.57 12.57 0 0 1-.4 1.187c-.079.187-.518 1.143-1.599 1.822-.935.588-1.673.618-1.76.62a4.89 4.89 0 0 1-.439.02c-1.07 0-2.016-.424-2.662-1.194-.656-.783-.913-1.81-.722-2.893l.672-3.808c.09-.512-.017-.982-.301-1.32-.274-.327-.696-.507-1.187-.507-1.166 0-2.325.99-2.531 2.162l-.735 3.998a.528.528 0 0 1-.52.432h-.883a.527.527 0 0 1-.52-.623l.762-4.144c.09-.51-.017-.98-.3-1.319-.275-.326-.697-.506-1.188-.506-1.165 0-2.324.99-2.531 2.162l-.734 3.998a.528.528 0 0 1-.52.432H9.21a.526.526 0 0 1-.52-.623l.764-4.159.512-2.799c.09-.509-.018-.976-.302-1.315-.274-.327-.696-.507-1.187-.507-1.21 0-1.989.465-2.454 1.463a10.662 10.662 0 0 0-.755 4.408c.108 2.737 1.266 5.313 3.26 7.252 1.995 1.939 4.603 3.024 7.343 3.057H16c2.266 0 4.435-.7 6.272-2.026a.942.942 0 0 1 .555-.18.962.962 0 0 1 .565 1.743 12.571 12.571 0 0 1-7.397 2.389" fill="#FFF2F6"/></g></svg></div></a>`;
    this.editorBtn.append(parseHTML(btnElement));
    this.editorBtn.querySelector('#editorBtn').addEventListener('click', this.onEditorButton.bind(this));
    const shadowRootElem = document.createElement('div');
    shadowRootElem.style.display = 'inline-flex';
    shadowRootElem.style.flexShrink = 0;
    shadowRootElem.style.alignItems = 'center';
    shadowRootElem.style.justifyContent = 'center';
    shadowRootElem.style.width = '48px';
    shadowRootElem.style.height = '48px';
    shadowRootElem.style.marginLeft = '12px';
    editorBtnContainer.append(shadowRootElem);
    const editorBtnShadow = shadowRootElem.attachShadow({mode: 'open'});
    const editorBtnStyle = document.createElement('style');
    editorBtnStyle.textContent = gmailIntegrationCsss;
    editorBtnShadow.append(editorBtnStyle);
    editorBtnShadow.append(this.editorBtn);
    this.editorBtnRoot.dataset[FRAME_STATUS] = FRAME_ATTACHED;
  }

  scanMsgs() {
    console.log('Gmail integration: scanning for messages...');
    const msgs = document.querySelectorAll('[data-message-id]');
    const activedMsgIds = [];
    for (const msgElem of msgs) {
      const msgId = msgElem.dataset.messageId;
      if (this.mailIds.includes(msgId)) {
        activedMsgIds.push(msgId);
        continue;
      }
      if (msgElem.querySelector('[data-mvelo-frame]')) {
        this.attachMsgBtns(msgId);
        activedMsgIds.push(msgId);
      }
      this.getEcryptedAttachments(msgId);
    }
    this.mailIds = [...activedMsgIds];
  }

  attachMsgBtns(msgId) {
    console.log('Gmail integration: adding mailvelope ui elemnts to message: ', msgId);
    const msgElem = document.querySelector(`[data-message-id="${msgId}"]`);
    if (!msgElem) {
      return;
    }
    // add top buttons
    const actionBtnsTopRoot = msgElem.querySelector('td.acX.bAm');
    // create secure reply
    const secureReplyBtn = document.createElement('div');
    secureReplyBtn.classList.add('mv-reply-btn-top');
    secureReplyBtn.setAttribute('title', l10n.map.provider_gmail_secure_reply_btn);
    secureReplyBtn.setAttribute('tabindex', 0);
    secureReplyBtn.setAttribute('role', 'button');
    secureReplyBtn.setAttribute('aria-label', l10n.map.provider_gmail_secure_reply_btn);
    secureReplyBtn.addEventListener('click', () => console.log('opening editor reply to msg id', msgId));
    const secureReplyBtnShadowRootElem = document.createElement('div');
    secureReplyBtnShadowRootElem.style.display = 'inline-flex';
    actionBtnsTopRoot.prepend(secureReplyBtnShadowRootElem);
    const secureReplyBtnShadow = secureReplyBtnShadowRootElem.attachShadow({mode: 'open'});
    const secureReplyBtnStyle = document.createElement('style');
    secureReplyBtnStyle.textContent = gmailIntegrationCsss;
    secureReplyBtnShadow.append(secureReplyBtnStyle);
    secureReplyBtnShadow.append(secureReplyBtn);

    // add menu items
    const menuBtn = actionBtnsTopRoot.querySelector('.T-I-Js-Gs.aap.T-I-awG');
    menuBtn.addEventListener('click', () => {
      const menuPopover = document.querySelector('.b7.J-M[role="menu"]');
      // add secure replay menu item
      let menuItemReplyShadowRootElem = menuPopover.querySelector('[data-mv-menu-item="reply"]');
      let secureReplyMenuItemShadow;
      if (!menuItemReplyShadowRootElem) {
        menuItemReplyShadowRootElem = document.createElement('div');
        menuItemReplyShadowRootElem.dataset.mvMenuItem = 'reply';
        menuItemReplyShadowRootElem.setAttribute('role', 'menuitem');
        menuPopover.prepend(menuItemReplyShadowRootElem);
        const secureReplyMenuItem = document.createElement('div');
        secureReplyMenuItem.classList.add('mv-menu-item', 'mv-menu-item-reply');
        secureReplyMenuItem.textContent = l10n.map.provider_gmail_secure_reply_btn;
        secureReplyMenuItemShadow = menuItemReplyShadowRootElem.attachShadow({mode: 'open'});
        const secureReplyMenuItemStyle = document.createElement('style');
        secureReplyMenuItemStyle.textContent = gmailIntegrationCsss;
        secureReplyMenuItemShadow.append(secureReplyMenuItemStyle);
        secureReplyMenuItemShadow.append(secureReplyMenuItem);
      } else {
        secureReplyMenuItemShadow = menuItemReplyShadowRootElem.shadowRoot;
      }
      secureReplyMenuItemShadow.lastChild.addEventListener('click', function _func(ev) {
        console.log('opening editor reply to msg id', msgId);
        menuBtn.blur();
        ev.target.removeEventListener('click', _func);
      });
    }, true);

    // add bottom buttons
    const actionBtnsBottom = msgElem.parentElement.querySelectorAll('span.ams[role="link"]');
    if (actionBtnsBottom.length) {
      let parent;
      for (const btn of actionBtnsBottom) {
        if (!parent) {
          parent = btn.parentElement;
        }
        // parent.removeChild(btn);
      }
      const actionBtnsBottomShadowRootElem = document.createElement('div');
      parent.prepend(actionBtnsBottomShadowRootElem);
      const actionBtnsBottomElem = document.createElement('div');
      actionBtnsBottomElem.classList.add('mv-action-btns-bottom');

      // add secure reply bottom button
      const secureReplyActionBtnBottom = document.createElement('span');
      secureReplyActionBtnBottom.classList.add('mv-action-btn-bottom', 'mv-action-btn-bottom-reply');
      secureReplyActionBtnBottom.textContent = l10n.map.provider_gmail_secure_reply_btn;
      secureReplyActionBtnBottom.addEventListener('click', () => console.log('opening editor reply to msg id', msgId));

      actionBtnsBottomElem.append(secureReplyActionBtnBottom);

      const actionBtnsBottomShadow = actionBtnsBottomShadowRootElem.attachShadow({mode: 'open'});
      const actionBtnsBottomStyle = document.createElement('style');
      actionBtnsBottomStyle.textContent = gmailIntegrationCsss;
      actionBtnsBottomShadow.append(actionBtnsBottomStyle);
      actionBtnsBottomShadow.append(actionBtnsBottomElem);
    }
  }

  getEcryptedAttachments(msgId) {
    console.log('looking for encrypted attachments for: ', msgId);
    const msg = document.querySelector(`[data-message-id="${msgId}"]`);
    if (!msg) {
      return;
    }
    const regex = /^(application\/octet-stream:.*\.(gpg|pgp)|text\/plain:.*\.asc):/;
    const attachments = msg.querySelectorAll('[download_url]');
    for (const attachment of attachments) {
      const dlUrl = attachment.getAttribute('download_url');
      if (dlUrl && regex.test(dlUrl)) {
        console.log('fetching attachment: ', decodeURI(dlUrl.match(new RegExp(':(.*?):'))[1]));
      }
    }
  }

  updateElements() {
    this.attachEditorBtn();
    this.scanMsgs();
    console.log('updating...');
  }

  removeElements() {
    console.log('removing elements...');
    console.log(`set status ${FRAME_DETACHED}`);
  }

  establishConnection() {
    this.port = EventHandler.connect(`gmailInt-${this.id}`, this);
    this.port.onDisconnect.addListener(this.removeElements.bind(this, false));
  }

  registerEventListener() {
    // attach event handlers
    document.addEventListener('mailvelope-observe', this.updateElements.bind(this, false));
    // this.port.on('get-recipients', this.getRecipients);
    // this.port.on('set-mv-editor-output', this.setEditorOutput);
    // this.port.on('destroy', this.closeFrame.bind(this, true));
    // this.port.on('mail-mv-editor-close', this.onMailEditorClose);
  }

  onEditorButton(ev) {
    console.log('opening editor');
    // this.emailTextElement.removeEventListener('keypress', this.handleKeypress);
    // this.eFrame.querySelector('.m-encrypt-container').classList.add('active');
    // this.showMailEditor();
    ev.stopPropagation();
  }
}
