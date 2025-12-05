/**
 * Copyright (C) 2025 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import EventHandler from '../lib/EventHandler';
import {getUUID, parseViewName} from '../lib/util';
import {FRAME_STATUS, FRAME_ATTACHED} from '../lib/constants';
import * as l10n from '../lib/l10n';
import outlookIntegrationCss from './outlookIntegration.css';
import {isAttached} from './main';
import AttachmentFrame from './attachmentFrame';

l10n.register([
  'encrypt_frame_btn_label',
  'provider_gmail_secure_reply_btn',
  'provider_gmail_secure_replyAll_btn',
  'provider_gmail_secure_forward_btn'
]);

export default class OutlookIntegration {
  constructor() {
    this.id = getUUID();
    this.port = null;
    this.editorBtnRoot = null;
    this.editorBtn = null;
    this.selectedMsgs = null;
    this.userInfo = null;
    this.updateElements = this.updateElements.bind(this);
  }

  getName() {
    return 'Outlook';
  }

  init() {
    this.establishConnection();
    this.registerEventListener();
    this.attachEditorBtn();
  }

  establishConnection() {
    this.port = EventHandler.connect(`outlookInt-${this.id}`, this);
    this.port.onUninstall.addListener(this.deactivate.bind(this));
  }

  registerEventListener() {
    document.addEventListener('mailvelope-observe', this.updateElements);
    this.port.on('update-message-data', this.onUpdateMessageData);
  }

  /**
   * Extract user information from Outlook page
   *
   * Finds the user's email by looking for the primary mailbox element
   * which has an id starting with "primaryMailboxRoot_" and contains
   * the email in data-folder-name or title attribute.
   *
   * @returns {Object} User info with email property
   */
  getUserInfo() {
    if (this.userInfo) {
      return this.userInfo;
    }
    const mailboxRoot = document.querySelector('[id^="primaryMailboxRoot"]');
    if (!mailboxRoot) {
      throw new Error('Outlook User Id not found.');
    }
    const email = mailboxRoot.getAttribute('data-folder-name') || mailboxRoot.getAttribute('title');
    if (!email) {
      throw new Error('Outlook User Id not found.');
    }
    this.userInfo = {
      email
    };
    return this.userInfo;
  }

  /**
   * Get message identifier for UI tracking
   *
   * Returns a local message identifier in the format: conversationID#messageIndex
   *
   * This is NOT a Microsoft Graph message ID. It's a composite identifier
   * used for UI tracking only. The controller layer will map this to the real
   * Microsoft Graph message ID (AAMk... format) by querying the Graph API.
   *
   * @param {HTMLElement} msgElem - Message container element (.aVla3)
   * @returns {string|null} Local message identifier (format: conversationID#messageIndex), or null if not available
   */
  getMsgId(msgElem) {
    const conversationId = this.getActiveConversationId();
    if (!conversationId) {
      // No active conversation - can happen during page reload before conversation is fully loaded
      return null;
    }
    const messageIndex = this.getMessageIndex(msgElem);
    if (messageIndex === -1) {
      return null;
    }
    return `${conversationId}#${messageIndex}`;
  }

  /**
   * Get active conversation ID from MailList
   *
   * Extracts the conversation ID from the currently selected conversation item
   * in the MailList. The selected item has aria-selected="true".
   *
   * @returns {string|null} Conversation ID (data-convid attribute value) or null if not found
   */
  getActiveConversationId() {
    const mailList = document.getElementById('MailList');
    if (!mailList) {
      return null;
    }
    // Find the selected conversation item
    const selectedItem = mailList.querySelector('[aria-selected="true"]');
    if (!selectedItem) {
      return null;
    }
    // Extract conversation ID from data-convid attribute
    return selectedItem.getAttribute('data-convid');
  }

  /**
   * Get message index (0-based) from DOM position
   *
   * Returns the zero-based index of the message element within all .aVla3 elements
   * in the reading pane. This index corresponds to the chronological order of
   * messages in the conversation as returned by the Microsoft Graph API.
   *
   * @param {HTMLElement} msgElem - Message container element (.aVla3)
   * @returns {number} Zero-based message index, or -1 if not found
   */
  getMessageIndex(msgElem) {
    const allMessages = document.querySelectorAll('.aVla3');
    return Array.from(allMessages).indexOf(msgElem);
  }

  onUpdateMessageData({msgId, data}) {
    const msg = this.selectedMsgs.get(msgId);
    this.selectedMsgs.set(msgId, {...msg, ...data});
    this.scanMessages();
  }

  getMsgByControllerId(controllerId) {
    if (!this.selectedMsgs) {
      return;
    }
    for (const [, value] of this.selectedMsgs) {
      if (value.controllerId === controllerId) {
        return value;
      }
    }
  }

  attachEditorBtn() {
    // Find compose button by icon (language-agnostic)
    const composeIcon = document.querySelector('[data-icon-name="ComposeRegular"]');
    if (!composeIcon) {
      return;
    }
    const composeButton = composeIcon.closest('button');
    if (!composeButton) {
      return;
    }
    // Navigate to wrapper div
    const composeWrapper = composeButton.closest('.ms-OverflowSet-item');
    if (!composeWrapper) {
      return;
    }
    // Check if button already attached
    if (isAttached(composeWrapper)) {
      return;
    }
    // Get toolbar container
    const toolbar = composeWrapper.parentElement;
    if (!toolbar) {
      return;
    }
    this.removeEditorButton();
    // Create Mailvelope button
    this.editorBtnRoot = toolbar;
    this.editorBtn = this.createEditorButton();
    // Inject after compose button
    toolbar.insertBefore(this.editorBtn, composeWrapper.nextElementSibling);
    // Mark as attached
    composeWrapper.dataset[FRAME_STATUS] = FRAME_ATTACHED;
  }

  createEditorButton() {
    // Create outer wrapper matching Outlook's structure
    const wrapper = document.createElement('div');
    wrapper.className = 'ms-OverflowSet-item ribbonOverflowItem';
    wrapper.setAttribute('role', 'none');
    wrapper.dataset.mvEditorBtn = 'true';
    // Create shadow DOM for style isolation
    const shadow = wrapper.attachShadow({mode: 'open'});
    // Create button container
    const buttonContainer = document.createElement('div');
    buttonContainer.id = `outlookInt-${this.id}`;
    buttonContainer.classList.add('mv-outlook-editor-btn-container');
    // Create button element
    const button = document.createElement('button');
    button.id = 'editorBtn';
    button.type = 'button';
    button.className = 'fui-Button ms-Button fui-SplitButton__primaryActionButton';
    button.setAttribute('aria-label', l10n.map.encrypt_frame_btn_label || 'Mailvelope');
    button.setAttribute('tabindex', '0');
    button.addEventListener('click', this.onEditorButton.bind(this));
    // Create button icon with Mailvelope SVG
    const icon = document.createElement('span');
    icon.className = 'fui-Button__icon ms-RibbonButton-icon';
    icon.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
        <g fill="none" fill-rule="evenodd">
          <circle cx="16" cy="16" r="16" fill="#FF004F"/>
          <path d="M15.995 28.667c-3.39 0-6.57-1.311-8.955-3.691-2.387-2.383-3.704-5.567-3.707-8.966a12.628 12.628 0 0 1 .592-3.836l.007-.028c.087-.306.194-.6.318-.875.022-.055.047-.116.073-.176.11-.251.545-1.115 1.588-1.77.943-.593 1.77-.644 1.866-.648.228-.027.464-.04.699-.04 1.07 0 2.015.423 2.662 1.194.492.587.76 1.307.78 2.097a4.321 4.321 0 0 1 1.959-.481c1.07 0 2.016.424 2.662 1.194.039.046.076.094.113.142.859-.852 1.993-1.336 3.14-1.336 1.07 0 2.015.424 2.662 1.194.656.782.913 1.81.722 2.893l-.672 3.807c-.09.513.017.982.301 1.321.274.327.696.507 1.187.507 1.482 0 2.003-1.08 2.345-2.246.293-1.033.428-2.107.401-3.191a10.675 10.675 0 0 0-3.219-7.387 10.683 10.683 0 0 0-7.445-3.086H16c-2.14 0-4.209.63-5.982 1.825a.97.97 0 0 1-.544.167.958.958 0 0 1-.729-.335L8.74 6.91a.96.96 0 0 1 .196-1.418 12.585 12.585 0 0 1 7.317-2.156 12.604 12.604 0 0 1 8.65 3.67 12.601 12.601 0 0 1 3.758 8.612 12.664 12.664 0 0 1-.41 3.606h.001l-.043.158-.019.063a12.57 12.57 0 0 1-.4 1.187c-.079.187-.518 1.143-1.599 1.822-.935.588-1.673.618-1.76.62a4.89 4.89 0 0 1-.439.02c-1.07 0-2.016-.424-2.662-1.194-.656-.783-.913-1.81-.722-2.893l.672-3.808c.09-.512-.017-.982-.301-1.32-.274-.327-.696-.507-1.187-.507-1.166 0-2.325.99-2.531 2.162l-.735 3.998a.528.528 0 0 1-.52.432h-.883a.527.527 0 0 1-.52-.623l.762-4.144c.09-.51-.017-.98-.3-1.319-.275-.326-.697-.506-1.188-.506-1.165 0-2.324.99-2.531 2.162l-.734 3.998a.528.528 0 0 1-.52.432H9.21a.526.526 0 0 1-.52-.623l.764-4.159.512-2.799c.09-.509-.018-.976-.302-1.315-.274-.327-.696-.507-1.187-.507-1.21 0-1.989.465-2.454 1.463a10.662 10.662 0 0 0-.755 4.408c.108 2.737 1.266 5.313 3.26 7.252 1.995 1.939 4.603 3.024 7.343 3.057H16c2.266 0 4.435-.7 6.272-2.026a.942.942 0 0 1 .555-.18.962.962 0 0 1 .565 1.743 12.571 12.571 0 0 1-7.397 2.389" fill="#FFF2F6"/>
        </g>
      </svg>
    `;
    // Create button text
    const text = document.createElement('span');
    text.className = 'textContainer';
    text.textContent = 'Mailvelope';
    button.appendChild(icon);
    button.appendChild(text);
    buttonContainer.appendChild(button);
    // Add styles from separate CSS file
    const style = document.createElement('style');
    style.textContent = outlookIntegrationCss;
    shadow.appendChild(style);
    shadow.appendChild(buttonContainer);
    return wrapper;
  }

  async scanMessages() {
    const msgs = document.querySelectorAll('.aVla3');
    const currentMsgs = new Map();
    for (const msgElem of msgs) {
      const msgData = {};
      const msgId = this.getMsgId(msgElem);
      if (!msgId) {
        // Skip if conversation not ready
        continue;
      }
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
        const aFrame = new AttachmentFrame(this.getName());
        msgData.controllerId = aFrame.id;
        msgData.controllerType = aFrame.mainType;
        const containerElem = msgElem.querySelector('[id^="UniqueMessageBody_"]');
        aFrame.attachTo(containerElem);
        // Fix positioning for Outlook: wrapper needs position:relative since Outlook elements have position:static
        const wrapper = containerElem?.querySelector('.m-extract-wrapper');
        if (wrapper) {
          wrapper.style.position = 'relative';
        }
        if (msgData.att.length) {
          msgData.plainText = this.getPlainText(msgElem);
        }
        if (msgData.clipped || msgData.plainText) {
          const bodyElem = msgElem.querySelector('[role="document"]');
          if (bodyElem) {
            bodyElem.style.display = 'none';
            msgData.hiddenElem = bodyElem;
          }
        }
      }
      if (msgData.controllerId) {
        msgData.msgId = msgId;
        this.attachMsgBtns(msgId, msgElem, msgData);
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

  hasClippedArmored() {
    // Could not reproduce clipped messages in Outlook
    return false;
  }

  getPlainText(msgElem) {
    const messageBody = msgElem.querySelector('[role="document"]');
    if (!messageBody) {
      return '';
    }
    const {innerText} = messageBody;
    return /\S/.test(innerText) ? innerText : '';
  }

  /**
   * Get encrypted attachments from message
   *
   * Detects files with extensions: .gpg, .pgp, .asc
   *
   * @param {HTMLElement} msgElem - Message element
   * @returns {Array<string>} Array of encrypted attachment filenames
   */
  getEncryptedAttachments(msgElem) {
    const attachmentsContainer = msgElem.querySelector('.E_kRz');
    if (!attachmentsContainer) {
      return [];
    }
    const filenameElements = attachmentsContainer.querySelectorAll('.VlyYV');
    const regex = /.*\.(gpg|pgp|asc)/;
    const attachments = [];
    for (const filenameElement of filenameElements) {
      const filename = filenameElement?.textContent || filenameElement?.getAttribute('title');
      if (filename && regex.test(filename)) {
        attachments.push(filename);
      }
    }
    return attachments;
  }

  attachMsgBtns(msgId, msgElem, msgData) {
    const actionToolbar = msgElem.querySelector('[aria-label*="actions"][role="toolbar"], [role="toolbar"].ms-OverflowSet');
    if (!actionToolbar) {
      return;
    }
    if (actionToolbar.querySelector('[data-mv-btn-top]')) {
      return;
    }
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
    actionToolbar.prepend(secureReplyBtnShadowRootElem);
    const secureReplyBtnShadow = secureReplyBtnShadowRootElem.attachShadow({mode: 'open'});
    const secureReplyBtnStyle = document.createElement('style');
    secureReplyBtnStyle.textContent = outlookIntegrationCss;
    secureReplyBtnShadow.append(secureReplyBtnStyle);
    secureReplyBtnShadow.append(secureReplyBtn);
    // TODO: This menu button code is a 1:1 copy from Gmail integration
    // It needs to be adapted for Outlook's menu structure and behavior
    // See gmailIntegration.js attachMsgBtns() for reference
    const menuBtn = actionToolbar.querySelector('[data-icon-name="MoreVerticalRegular"]');
    if (menuBtn) {
      menuBtn.dataset.mvMenuBtns = FRAME_ATTACHED;
      msgData.menuMouseDownHandler = () => {
        this.menuPopover = document.querySelector('[role="menu"]');
        setTimeout(() => {
          this.addMenuBtn('reply', this.menuPopover, null, ev => this.onSecureButton(ev, 'reply', msgId));
          const replyAllItem = this.menuPopover?.querySelector('[data-icon-name="ReplyAllRegular"]');
          if (replyAllItem && replyAllItem.style.display !== 'none') {
            this.addMenuBtn('replyAll', this.menuPopover, replyAllItem, ev => this.onSecureButton(ev, 'reply', msgId, true));
          }
          this.addMenuBtn('forward', this.menuPopover, this.menuPopover?.querySelector('[data-icon-name="ForwardRegular"]'), ev => this.onSecureButton(ev, 'forward', msgId));
        }, !this.menuPopover?.hasChildNodes() ? 50 : 0);
      };
      menuBtn.addEventListener('mousedown', msgData.menuMouseDownHandler, {capture: true});
      msgData.menuBlurHandler = () => {
        this.cleanupMenuBtns();
      };
      menuBtn.addEventListener('blur', msgData.menuBlurHandler, {capture: true});
    }
  }

  // TODO: This method is a 1:1 copy from Gmail integration (gmailIntegration.js)
  // It needs to be adapted for Outlook's bottom action button structure
  // Outlook may use different selectors and DOM structure for quick actions
  addBottomBtns(msgId, msgElem) {
    const quickActionsToolbar = msgElem.querySelector('.th6py');
    if (!quickActionsToolbar) {
      return;
    }
    if (quickActionsToolbar.querySelector('[data-mv-btns-bottom]')) {
      return;
    }
    const actionBtnsBottom = quickActionsToolbar.querySelectorAll('button.fui-Button');
    if (!actionBtnsBottom.length) {
      return;
    }
    let hasReplyAllBtn = false;
    for (const btn of actionBtnsBottom) {
      const icon = btn.querySelector('[data-icon-name]');
      if (icon && icon.dataset.iconName === 'ArrowReplyAllRegular') {
        hasReplyAllBtn = true;
      }
      btn.style.display = 'none';
    }
    const actionBtnsBottomShadowRootElem = document.createElement('div');
    actionBtnsBottomShadowRootElem.dataset.mvBtnsBottom = FRAME_ATTACHED;
    const firstButton = actionBtnsBottom[0];
    quickActionsToolbar.insertBefore(actionBtnsBottomShadowRootElem, firstButton);
    const actionBtnsBottomElem = document.createElement('div');
    actionBtnsBottomElem.classList.add('mv-action-btns-bottom');
    this.addBottomBtn('reply', actionBtnsBottomElem, ev => this.onSecureButton(ev, 'reply', msgId));
    if (hasReplyAllBtn) {
      this.addBottomBtn('replyAll', actionBtnsBottomElem, ev => this.onSecureButton(ev, 'reply', msgId, true));
    }
    this.addBottomBtn('forward', actionBtnsBottomElem, ev => this.onSecureButton(ev, 'forward', msgId));
    const actionBtnsBottomShadow = actionBtnsBottomShadowRootElem.attachShadow({mode: 'open'});
    const actionBtnsBottomStyle = document.createElement('style');
    actionBtnsBottomStyle.textContent = outlookIntegrationCss;
    actionBtnsBottomShadow.append(actionBtnsBottomStyle);
    actionBtnsBottomShadow.append(actionBtnsBottomElem);
  }

  // TODO: This method is a 1:1 copy from Gmail integration (gmailIntegration.js)
  // It needs to be adapted for Outlook's button styling and structure
  addBottomBtn(name, container, clickHandler) {
    const secureActionBtnBottom = document.createElement('span');
    secureActionBtnBottom.classList.add('mv-action-btn-bottom', `mv-action-btn-bottom-${name}`);
    secureActionBtnBottom.textContent = l10n.map[`provider_gmail_secure_${name}_btn`];
    secureActionBtnBottom.addEventListener('click', clickHandler);
    container.append(secureActionBtnBottom);
  }

  // TODO: This method is a 1:1 copy from Gmail integration (gmailIntegration.js)
  // It needs to be adapted for Outlook's menu structure and styling
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
      secureMenuItemStyle.textContent = outlookIntegrationCss;
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
    this.attachEditorBtn();
    await this.scanMessages();
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
    this.removeEditorButton();
    if (this.selectedMsgs) {
      for (const {msgId, menuMouseDownHandler, menuBlurHandler, clipped, hiddenElem} of this.selectedMsgs.values()) {
        let msgElem;
        // Parse msgId format: conversationID#messageIndex
        if (msgId.includes('#')) {
          const [, messageIndexStr] = msgId.split('#');
          const messageIndex = parseInt(messageIndexStr, 10);
          const allMessages = document.querySelectorAll('.aVla3');
          if (messageIndex >= 0 && messageIndex < allMessages.length) {
            msgElem = allMessages[messageIndex];
          }
        }
        if (!msgElem) {
          continue;
        }
        msgElem.querySelectorAll('[data-mv-btn-top]').forEach(node => node.parentNode && node.parentNode.removeChild(node));
        const menuBtnElem = msgElem.querySelector('[data-mv-menu-btns]');
        if (menuBtnElem) {
          menuBtnElem.removeEventListener('mousedown', menuMouseDownHandler, true);
          menuBtnElem.removeEventListener('blur', menuBlurHandler, true);
          menuBtnElem.removeAttribute('data-mv-menu-btns');
        }
        if (clipped) {
          const bodyElem = msgElem.querySelector('[role="document"]');
          if (bodyElem) {
            bodyElem.style.display = 'block';
          }
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
        parent.querySelectorAll('button.fui-Button[role="menuitem"]').forEach(node => node.style.display = '');
      }
    }
    this.cleanupMenuBtns();
  }

  removeEditorButton() {
    if (this.editorBtn) {
      this.editorBtn.parentNode && this.editorBtn.parentNode.removeChild(this.editorBtn);
      this.editorBtn = null;
    }
    // Remove FRAME_ATTACHED marker
    const composeIcon = document.querySelector('[data-icon-name="ComposeRegular"]');
    const composeButton = composeIcon?.closest('button');
    const composeWrapper = composeButton?.closest('.ms-OverflowSet-item');
    if (composeWrapper) {
      composeWrapper.removeAttribute(`data-${FRAME_STATUS}`);
    }
  }

  onEditorButton(ev) {
    this.editorBtn.blur();
    this.port.emit('open-editor', {userInfo: this.getUserInfo()});
    ev.stopPropagation();
  }

  /**
   * Handle secure action button click (reply, forward)
   *
   * @param {Event} ev - Click event
   * @param {string} type - Action type ('reply' or 'forward')
   * @param {string} msgId - Local message ID in format: conversationID#messageIndex
   * @param {boolean} all - Reply all flag
   */
  onSecureButton(ev, type, msgId, all = false) {
    this.port.emit('secure-button', {
      type,
      msgId,
      all,
      userInfo: this.getUserInfo()
    });
    ev.stopPropagation();
  }
}
