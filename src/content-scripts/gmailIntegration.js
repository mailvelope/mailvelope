/**
 * Copyright (C) 2019 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */
import EventHandler from '../lib/EventHandler';
import {getHash, parseHTML} from '../lib/util';
import {FRAME_STATUS, FRAME_ATTACHED} from '../lib/constants';
import * as l10n from '../lib/l10n';
import gmailIntegrationCsss from './gmailIntegration.css';
import {isAttached} from './main';
import AttachmentFrame from './attachmentFrame';
import {parseViewName} from '../controller/sub.controller';

l10n.register([
  'encrypt_frame_btn_label',
  'provider_gmail_secure_reply_btn',
  'provider_gmail_secure_replyAll_btn',
  'provider_gmail_secure_forward_btn'
]);

export default class GmailIntegration {
  constructor() {
    this.id = getHash();
    this.port = null;
    this.editorBtnRoot = null;
    this.editorBtn = null;
    this.selectedMsgs = null;
    this.userEmail = null;
    this.updateElements = this.updateElements.bind(this);
  }

  init() {
    this.establishConnection();
    this.registerEventListener();
    this.attachEditorBtn();
  }

  establishConnection() {
    this.port = EventHandler.connect(`gmailInt-${this.id}`, this);
    this.port.onDisconnect.addListener(this.deactivate.bind(this));
  }

  registerEventListener() {
    document.addEventListener('mailvelope-observe', this.updateElements);
    this.port.on('update-message-data', this.onUpdateMessageData);
  }

  getGmailUser() {
    if (this.userEmail) {
      return this.userEmail;
    }
    const titleElem = document.querySelector('title');
    const match = titleElem.innerText.match(/([a-zA-Z0-9._-]+@([a-zA-Z0-9_-]+\.)+[a-zA-Z0-9_-]+)/gi);
    if (!match) {
      return;
    }
    this.userEmail = match[0];
    return this.userEmail;
  }

  getMsgId(msgElem) {
    const rawID = msgElem.dataset.messageId;
    return rawID[0] === '#' ? rawID.substr(1) : rawID;
  }

  onUpdateMessageData({msgId, data}) {
    const msg = this.selectedMsgs.get(msgId);
    this.selectedMsgs.set(msgId, {...msg, ...data});
    this.scanMessages();
  }

  getMsgByControllerId(controllerId) {
    for (const [, value] of this.selectedMsgs) {
      if (value.controllerId === controllerId) {
        return value;
      }
    }
    return;
  }

  attachEditorBtn() {
    this.editorBtnRoot = document.querySelector('.aic');
    if (!this.editorBtnRoot || isAttached(this.editorBtnRoot)) {
      return;
    }
    this.editorBtnRoot.style.overflow = 'hidden';
    const editorBtnContainer = this.editorBtnRoot.querySelector('.z0');
    const editorBtnElem = document.createElement('div');
    editorBtnElem.id = `gmailInt-${this.id}`;
    editorBtnElem.classList.add('mv-editor-btn-container');
    const btnElement = `<a id="editorBtn" class="mv-editor-btn" title="${l10n.map.encrypt_frame_btn_label}"><div class="mv-editor-btn-content"><svg width="24px" height="24px" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><g fill="none" fill-rule="evenodd"><circle cx="16" cy="16" r="16" fill="#FF004F"/><path d="M15.995 28.667c-3.39 0-6.57-1.311-8.955-3.691-2.387-2.383-3.704-5.567-3.707-8.966a12.628 12.628 0 0 1 .592-3.836l.007-.028c.087-.306.194-.6.318-.875.022-.055.047-.116.073-.176.11-.251.545-1.115 1.588-1.77.943-.593 1.77-.644 1.866-.648.228-.027.464-.04.699-.04 1.07 0 2.015.423 2.662 1.194.492.587.76 1.307.78 2.097a4.321 4.321 0 0 1 1.959-.481c1.07 0 2.016.424 2.662 1.194.039.046.076.094.113.142.859-.852 1.993-1.336 3.14-1.336 1.07 0 2.015.424 2.662 1.194.656.782.913 1.81.722 2.893l-.672 3.807c-.09.513.017.982.301 1.321.274.327.696.507 1.187.507 1.482 0 2.003-1.08 2.345-2.246.293-1.033.428-2.107.401-3.191a10.675 10.675 0 0 0-3.219-7.387 10.683 10.683 0 0 0-7.445-3.086H16c-2.14 0-4.209.63-5.982 1.825a.97.97 0 0 1-.544.167.958.958 0 0 1-.729-.335L8.74 6.91a.96.96 0 0 1 .196-1.418 12.585 12.585 0 0 1 7.317-2.156 12.604 12.604 0 0 1 8.65 3.67 12.601 12.601 0 0 1 3.758 8.612 12.664 12.664 0 0 1-.41 3.606h.001l-.043.158-.019.063a12.57 12.57 0 0 1-.4 1.187c-.079.187-.518 1.143-1.599 1.822-.935.588-1.673.618-1.76.62a4.89 4.89 0 0 1-.439.02c-1.07 0-2.016-.424-2.662-1.194-.656-.783-.913-1.81-.722-2.893l.672-3.808c.09-.512-.017-.982-.301-1.32-.274-.327-.696-.507-1.187-.507-1.166 0-2.325.99-2.531 2.162l-.735 3.998a.528.528 0 0 1-.52.432h-.883a.527.527 0 0 1-.52-.623l.762-4.144c.09-.51-.017-.98-.3-1.319-.275-.326-.697-.506-1.188-.506-1.165 0-2.324.99-2.531 2.162l-.734 3.998a.528.528 0 0 1-.52.432H9.21a.526.526 0 0 1-.52-.623l.764-4.159.512-2.799c.09-.509-.018-.976-.302-1.315-.274-.327-.696-.507-1.187-.507-1.21 0-1.989.465-2.454 1.463a10.662 10.662 0 0 0-.755 4.408c.108 2.737 1.266 5.313 3.26 7.252 1.995 1.939 4.603 3.024 7.343 3.057H16c2.266 0 4.435-.7 6.272-2.026a.942.942 0 0 1 .555-.18.962.962 0 0 1 .565 1.743 12.571 12.571 0 0 1-7.397 2.389" fill="#FFF2F6"/></g></svg></div></a>`;
    editorBtnElem.append(parseHTML(btnElement));
    editorBtnElem.querySelector('#editorBtn').addEventListener('click', this.onEditorButton.bind(this));
    this.editorBtn = document.createElement('div');
    this.editorBtn.style.display = 'inline-flex';
    this.editorBtn.style.flexShrink = 0;
    this.editorBtn.style.alignItems = 'center';
    this.editorBtn.style.justifyContent = 'center';
    this.editorBtn.style.width = '48px';
    this.editorBtn.style.height = '48px';
    this.editorBtn.style.marginLeft = '12px';
    editorBtnContainer.append(this.editorBtn);
    const editorBtnShadow = this.editorBtn.attachShadow({mode: 'open'});
    const editorBtnStyle = document.createElement('style');
    editorBtnStyle.textContent = gmailIntegrationCsss;
    editorBtnShadow.append(editorBtnStyle);
    editorBtnShadow.append(editorBtnElem);
    this.editorBtnRoot.dataset[FRAME_STATUS] = FRAME_ATTACHED;
  }

  async scanMessages() {
    const msgs = document.querySelectorAll('[data-message-id]');
    const currentMsgs = new Map();
    for (const msgElem of msgs) {
      const msgData = {};
      const msgId = this.getMsgId(msgElem);
      const mvFrame = msgElem.querySelector(`[data-mvelo-frame="${FRAME_ATTACHED}"]`);
      if (mvFrame) {
        const {id, type} = this.getControllerDetails(mvFrame);
        msgData.controllerId = id;
        msgData.controllerType = type;
      }
      const selected = this.selectedMsgs && this.selectedMsgs.get(msgId);
      if (selected) {
        selected.controllerId = msgData.controllerId || selected.controllerId;
        currentMsgs.set(msgId, selected);
        if (selected.controllerType === 'dFrame' || selected.clipped || selected.secureAction) {
          this.addBottomBtns(msgId, msgElem);
        }
        continue;
      }
      if (this.hasClippedArmored(msgElem)) {
        msgData.clipped = true;
      }
      msgData.att = this.getEncryptedAttachments(msgElem);
      if (!msgData.controllerId && (msgData.clipped || msgData.att.length)) {
        const aFrame = new AttachmentFrame();
        msgData.controllerId = aFrame.id;
        msgData.controllerType = aFrame.mainType;
        const containerElem = msgElem.querySelector('.ii.gt');
        aFrame.attachTo(containerElem);
        if (msgData.att.length) {
          msgData.clearText = this.getClearText(msgElem);
        }
        if (msgData.clipped || msgData.clearText) {
          const bodyElem = containerElem.querySelector('.a3s.aXjCH');
          bodyElem.style.display = 'none';
          msgData.hiddenElem = bodyElem;
        }
      }
      if (msgData.controllerId) {
        msgData.msgId = msgId;
        // add top and menu buttons
        this.attachMsgBtns(msgId, msgElem, msgData);
        // add bottom buttons in case of decryp frame
        if (msgData.controllerType === 'dFrame' || msgData.clipped) {
          this.addBottomBtns(msgId, msgElem);
        }
        currentMsgs.set(msgId, msgData);
      }
    }
    this.selectedMsgs = currentMsgs;
  }

  getControllerDetails(frameElem) {
    const eframe = frameElem.lastChild.shadowRoot.querySelector('.m-extract-frame');
    return {id: parseViewName(eframe.id).id, type: eframe.dataset.mvControllerType};
  }

  hasClippedArmored(msgElem) {
    const clipped = msgElem.querySelector('.iX a');
    if (clipped && clipped.href.includes('view=lg')) {
      const msgText = msgElem.querySelector('.a3s.aXjCH').innerText;
      return /BEGIN\sPGP\sMESSAGE/.test(msgText);
    }
    return false;
  }

  getClearText(msgElem) {
    const {innerText} = msgElem.querySelectorAll('.ii.gt')[0];
    return /\S/.test(innerText) ? innerText : '';
  }

  getEncryptedAttachments(msgElem) {
    const attachmentElems = msgElem.querySelectorAll('.zzV0ie');
    const regex = /.*\.(gpg|pgp|asc)/;
    const attachments = [];
    for (const attachmentElem of attachmentElems) {
      const fileName = attachmentElem.innerText;
      if (fileName && regex.test(fileName)) {
        attachments.push(fileName);
      }
    }
    return attachments;
  }

  attachMsgBtns(msgId, msgElem, msgData) {
    // add top buttons
    const actionBtnsTopRoot = msgElem.querySelector('td.acX.bAm');
    const secureReplyBtn = document.createElement('div');
    secureReplyBtn.classList.add('mv-reply-btn-top');
    secureReplyBtn.setAttribute('title', l10n.map.provider_gmail_secure_reply_btn);
    secureReplyBtn.setAttribute('tabindex', 0);
    secureReplyBtn.setAttribute('role', 'button');
    secureReplyBtn.setAttribute('aria-label', l10n.map.provider_gmail_secure_reply_btn);
    secureReplyBtn.addEventListener('click', ev => this.onSecureButton(ev, 'reply', msgId));
    const secureReplyBtnShadowRootElem = document.createElement('div');
    secureReplyBtnShadowRootElem.dataset.mvBtnTop = 'reply';
    secureReplyBtnShadowRootElem.style.display = 'inline-flex';
    actionBtnsTopRoot.prepend(secureReplyBtnShadowRootElem);
    const secureReplyBtnShadow = secureReplyBtnShadowRootElem.attachShadow({mode: 'open'});
    const secureReplyBtnStyle = document.createElement('style');
    secureReplyBtnStyle.textContent = gmailIntegrationCsss;
    secureReplyBtnShadow.append(secureReplyBtnStyle);
    secureReplyBtnShadow.append(secureReplyBtn);
    // add menu items - TODO: improve click handler as it fails attaching the secure buttons to the menu in some rare cases
    const menuBtn = actionBtnsTopRoot.querySelector('.T-I-Js-Gs.aap.T-I-awG');
    if (menuBtn) {
      menuBtn.dataset.mvMenuBtns = FRAME_ATTACHED;
      msgData.menuClickHandler = () => {
        setTimeout(() => {
          this.menuPopover = document.querySelector('.b7.J-M[role="menu"]');
          this.addMenuBtn('reply', this.menuPopover, null, ev => this.onSecureButton(ev, 'reply', msgId));
          const replyMenuItem = this.menuPopover.querySelector('[role="menuitem"][id="r2"]');
          if (replyMenuItem.style.display !== 'none') {
            this.addMenuBtn('replyAll', this.menuPopover, replyMenuItem, ev => this.onSecureButton(ev, 'reply', msgId, true));
          }
          this.addMenuBtn('forward', this.menuPopover, this.menuPopover.querySelector('[role="menuitem"][id="r3"]'), ev => this.onSecureButton(ev, 'forward', msgId));
        }, !this.menuPopover ? 50 : 0);
      };
      menuBtn.addEventListener('click', msgData.menuClickHandler, {capture: true});
      msgData.menuBlurHandler = () => {
        this.cleanupMenuBtns();
      };
      menuBtn.addEventListener('blur', msgData.menuBlurHandler, {capture: true});
    }
  }

  addBottomBtns(msgId, msgElem) {
    const bottomBtnsContainer = msgElem.nextSibling;
    if (bottomBtnsContainer) {
      if (bottomBtnsContainer.querySelector('[data-mv-btns-bottom]')) {
        return;
      }
      const actionBtnsBottom = bottomBtnsContainer.querySelectorAll('span.ams[role="link"]');
      if (actionBtnsBottom.length) {
        let parent;
        let hasReplyAllBtn = false;
        for (const btn of actionBtnsBottom) {
          if (!parent) {
            parent = btn.parentElement;
          }
          if (btn.classList.contains('bkI')) {
            hasReplyAllBtn = true;
          }
          btn.style.display = 'none';
        }
        const actionBtnsBottomShadowRootElem = document.createElement('div');
        actionBtnsBottomShadowRootElem.dataset.mvBtnsBottom = FRAME_ATTACHED;
        parent.prepend(actionBtnsBottomShadowRootElem);
        const actionBtnsBottomElem = document.createElement('div');
        actionBtnsBottomElem.classList.add('mv-action-btns-bottom');
        this.addBottomBtn('reply', actionBtnsBottomElem, ev => this.onSecureButton(ev, 'reply', msgId));
        if (hasReplyAllBtn) {
          this.addBottomBtn('replyAll', actionBtnsBottomElem, ev => this.onSecureButton(ev, 'reply', msgId, true));
        }
        this.addBottomBtn('forward', actionBtnsBottomElem, ev => this.onSecureButton(ev, 'forward', msgId));
        const actionBtnsBottomShadow = actionBtnsBottomShadowRootElem.attachShadow({mode: 'open'});
        const actionBtnsBottomStyle = document.createElement('style');
        actionBtnsBottomStyle.textContent = gmailIntegrationCsss;
        actionBtnsBottomShadow.append(actionBtnsBottomStyle);
        actionBtnsBottomShadow.append(actionBtnsBottomElem);
      }
    }
  }

  addBottomBtn(name, container, clickHandler) {
    const secureActionBtnBottom = document.createElement('span');
    secureActionBtnBottom.classList.add('mv-action-btn-bottom', `mv-action-btn-bottom-${name}`);
    secureActionBtnBottom.textContent = l10n.map[`provider_gmail_secure_${name}_btn`];
    secureActionBtnBottom.addEventListener('click', clickHandler);
    container.append(secureActionBtnBottom);
  }

  addMenuBtn(name, container, beforeElem, clickHandler) {
    let menuItemShadowRootElem = container.querySelector(`[data-mv-menu-item="${name}"]`);
    let secureMenuItemShadow;
    if (!menuItemShadowRootElem) {
      menuItemShadowRootElem = document.createElement('div');
      menuItemShadowRootElem.dataset.mvMenuItem = name;
      menuItemShadowRootElem.setAttribute('role', 'menuitem');
      container.insertBefore(menuItemShadowRootElem, beforeElem || container.firstChild);
      const secureMenuItem = document.createElement('div');
      secureMenuItem.classList.add('mv-menu-item', `mv-menu-item-${name}`);
      secureMenuItem.textContent = l10n.map[`provider_gmail_secure_${name}_btn`];
      secureMenuItemShadow = menuItemShadowRootElem.attachShadow({mode: 'open'});
      const secureMenuItemStyle = document.createElement('style');
      secureMenuItemStyle.textContent = gmailIntegrationCsss;
      secureMenuItemShadow.append(secureMenuItemStyle);
      secureMenuItemShadow.append(secureMenuItem);
    } else {
      secureMenuItemShadow = menuItemShadowRootElem.shadowRoot;
      const cloned = secureMenuItemShadow.lastChild.cloneNode(true);
      secureMenuItemShadow.replaceChild(cloned, secureMenuItemShadow.lastChild);
    }
    secureMenuItemShadow.lastChild.addEventListener('click', clickHandler, {once: true});
  }

  cleanupMenuBtns() {
    if (this.menuPopover) {
      this.menuPopover.querySelectorAll('[data-mv-menu-item]').forEach(node => node.parentNode && node.parentNode.removeChild(node));
    }
  }

  async updateElements() {
    if (this.getGmailUser()) {
      this.attachEditorBtn();
      await this.scanMessages();
    }
  }

  onCloseFrame(controllerId) {
    const message = this.getMsgByControllerId(controllerId);
    if (message && message.hiddenElem) {
      message.hiddenElem.style.display = 'block';
    }
  }

  deactivate() {
    document.removeEventListener('mailvelope-observe', this.updateElements);
    this.removeElements();
    this.selectedMsgs = null;
  }

  removeElements() {
    if (this.editorBtn) {
      this.editorBtn.parentNode && this.editorBtn.parentNode.removeChild(this.editorBtn);
      this.editorBtnRoot.removeAttribute('data-mvelo-frame');
      this.editorBtnRoot.style.overflow = 'inherit';
    }
    if (this.selectedMsgs) {
      for (const {msgId, menuClickHandler, menuBlurHandler, clipped, hiddenElem} of this.selectedMsgs.values()) {
        const msgElem = document.querySelector(`[data-message-id="#${msgId}"]`);
        if (!msgElem) {
          continue;
        }
        msgElem.querySelectorAll('[data-mv-btn-top]').forEach(node => node.parentNode && node.parentNode.removeChild(node));
        const menuBtnElem = msgElem.querySelector('[data-mv-menu-btns]');
        if (menuBtnElem) {
          menuBtnElem.removeEventListener('click', menuClickHandler, true);
          menuBtnElem.removeEventListener('blur', menuBlurHandler, true);
          menuBtnElem.removeAttribute('data-mv-menu-btns');
        }
        if (clipped) {
          const bodyElem = msgElem.querySelector('.a3s.aXjCH');
          bodyElem.style.display = 'block';
        }
        if (hiddenElem) {
          hiddenElem.style.display = 'block';
        }
      }
    }
    const btnsBottomElem = document.querySelector('[data-mv-btns-bottom]');
    if (btnsBottomElem) {
      const parent = btnsBottomElem.parentNode;
      if (parent) {
        parent.removeChild(btnsBottomElem);
        parent.querySelectorAll('span.ams[role="link"]').forEach(node => node.style.display = 'inline-flex');
      }
    }
    this.cleanupMenuBtns();
  }

  onEditorButton(ev) {
    this.port.emit('open-editor', {userEmail: this.getGmailUser()});
    ev.stopPropagation();
  }

  onSecureButton(ev, type, msgId, all = false) {
    this.port.emit('secure-button', {type, msgId, all, userEmail: this.getGmailUser()});
    ev.stopPropagation();
  }
}
