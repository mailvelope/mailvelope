/**
 * Copyright (C) 2019 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */
import EventHandler from '../lib/EventHandler';
import {getUUID, parseHTML, parseViewName} from '../lib/util';
import {FRAME_STATUS, FRAME_ATTACHED} from '../lib/constants';
import * as l10n from '../lib/l10n';
import gmailIntegrationCsss from './gmailIntegration.css';
import {isAttached} from './main';
import AttachmentFrame from './attachmentFrame';

l10n.register([
  'encrypt_frame_btn_label',
  'provider_gmail_secure_reply_btn',
  'provider_gmail_secure_replyAll_btn',
  'provider_gmail_secure_forward_btn'
]);

const MSG_BODY_SELECTOR = '.a3s.aXjCH, .a3s.aiL';

export default class GmailIntegration {
  constructor() {
    this.id = getUUID();
    this.port = null;
    this.editorBtnRoot = null;
    this.editorBtn = null;
    this.selectedMsgs = null;
    this.userInfo = null;
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

  getUserInfo() {
    if (this.userInfo) {
      return this.userInfo;
    }
    const titleElem = document.querySelector('title');
    const match = titleElem.innerText.match(/([a-zA-Z0-9._-]+@([a-zA-Z0-9_-]+\.)+[a-zA-Z0-9_-]+)/gi);
    if (!match) {
      throw new Error('Gmail User Id not found.');
    }
    this.userInfo = {};
    this.userInfo.email = match[0];
    this.userInfo.legacyGsuite = Array.from(document.querySelectorAll('.aiG .aiD span')).some(element => /^1(?:5|7)[\sG]/.test(element.textContent));
    return this.userInfo;
  }

  getMsgId(msgElem) {
    const rawID = msgElem.dataset.messageId;
    return rawID[0] === '#' ? rawID.slice(1) : rawID;
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
    const nav = document.querySelector('.aIH') ?? document.querySelector('.aeN');
    if (!nav) {
      return;
    }
    if (nav.querySelector('.aic > .z0')) {
      // standard Gmail compose button
      const editorBtnRoot = nav.querySelector('.aic');
      if (isAttached(editorBtnRoot)) {
        return;
      }
      this.removeEditorButton();
      this.editorBtnRoot = editorBtnRoot;
      const editorBtnContainer = this.editorBtnRoot.querySelector('.z0');
      this.editorBtn = this.createEditorButton();
      editorBtnContainer.append(this.editorBtn);
      this.editorBtnRoot.style.overflow = 'hidden';
      this.editorBtnRoot.dataset[FRAME_STATUS] = FRAME_ATTACHED;
      return;
    }
    const compGmailBtn = nav.querySelector('.Yh.akV');
    if (compGmailBtn) {
      // Meet section active in main menu
      this.editorBtnRoot = compGmailBtn.parentElement;
      if (isAttached(this.editorBtnRoot)) {
        return;
      }
      this.editorBtn = this.createEditorButtonMeet(compGmailBtn);
      this.editorBtnRoot.insertBefore(this.editorBtn, compGmailBtn);
      this.editorBtnRoot.dataset[FRAME_STATUS] = FRAME_ATTACHED;
      return;
    }
  }

  createEditorButton() {
    const editorBtnElem = document.createElement('div');
    editorBtnElem.id = `gmailInt-${this.id}`;
    editorBtnElem.classList.add('mv-editor-btn-container');
    const btnElement = `<a id="editorBtn" class="mv-editor-btn" title="${l10n.map.encrypt_frame_btn_label}"><div class="mv-editor-btn-content"><svg width="24px" height="24px" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><g fill="none" fill-rule="evenodd"><circle cx="16" cy="16" r="16" fill="#FF004F"/><path d="M15.995 28.667c-3.39 0-6.57-1.311-8.955-3.691-2.387-2.383-3.704-5.567-3.707-8.966a12.628 12.628 0 0 1 .592-3.836l.007-.028c.087-.306.194-.6.318-.875.022-.055.047-.116.073-.176.11-.251.545-1.115 1.588-1.77.943-.593 1.77-.644 1.866-.648.228-.027.464-.04.699-.04 1.07 0 2.015.423 2.662 1.194.492.587.76 1.307.78 2.097a4.321 4.321 0 0 1 1.959-.481c1.07 0 2.016.424 2.662 1.194.039.046.076.094.113.142.859-.852 1.993-1.336 3.14-1.336 1.07 0 2.015.424 2.662 1.194.656.782.913 1.81.722 2.893l-.672 3.807c-.09.513.017.982.301 1.321.274.327.696.507 1.187.507 1.482 0 2.003-1.08 2.345-2.246.293-1.033.428-2.107.401-3.191a10.675 10.675 0 0 0-3.219-7.387 10.683 10.683 0 0 0-7.445-3.086H16c-2.14 0-4.209.63-5.982 1.825a.97.97 0 0 1-.544.167.958.958 0 0 1-.729-.335L8.74 6.91a.96.96 0 0 1 .196-1.418 12.585 12.585 0 0 1 7.317-2.156 12.604 12.604 0 0 1 8.65 3.67 12.601 12.601 0 0 1 3.758 8.612 12.664 12.664 0 0 1-.41 3.606h.001l-.043.158-.019.063a12.57 12.57 0 0 1-.4 1.187c-.079.187-.518 1.143-1.599 1.822-.935.588-1.673.618-1.76.62a4.89 4.89 0 0 1-.439.02c-1.07 0-2.016-.424-2.662-1.194-.656-.783-.913-1.81-.722-2.893l.672-3.808c.09-.512-.017-.982-.301-1.32-.274-.327-.696-.507-1.187-.507-1.166 0-2.325.99-2.531 2.162l-.735 3.998a.528.528 0 0 1-.52.432h-.883a.527.527 0 0 1-.52-.623l.762-4.144c.09-.51-.017-.98-.3-1.319-.275-.326-.697-.506-1.188-.506-1.165 0-2.324.99-2.531 2.162l-.734 3.998a.528.528 0 0 1-.52.432H9.21a.526.526 0 0 1-.52-.623l.764-4.159.512-2.799c.09-.509-.018-.976-.302-1.315-.274-.327-.696-.507-1.187-.507-1.21 0-1.989.465-2.454 1.463a10.662 10.662 0 0 0-.755 4.408c.108 2.737 1.266 5.313 3.26 7.252 1.995 1.939 4.603 3.024 7.343 3.057H16c2.266 0 4.435-.7 6.272-2.026a.942.942 0 0 1 .555-.18.962.962 0 0 1 .565 1.743 12.571 12.571 0 0 1-7.397 2.389" fill="#FFF2F6"/></g></svg></div></a>`;
    editorBtnElem.append(...parseHTML(btnElement));
    editorBtnElem.querySelector('#editorBtn').addEventListener('click', this.onEditorButton.bind(this));
    const editorBtn = document.createElement('div');
    editorBtn.style.display = 'inline-flex';
    editorBtn.style.flexShrink = 0;
    editorBtn.style.alignItems = 'center';
    editorBtn.style.justifyContent = 'center';
    editorBtn.style.width = '48px';
    editorBtn.style.height = '48px';
    editorBtn.style.marginLeft = '12px';
    const editorBtnShadow = editorBtn.attachShadow({mode: 'open'});
    const editorBtnStyle = document.createElement('style');
    editorBtnStyle.textContent = gmailIntegrationCsss;
    editorBtnShadow.append(editorBtnStyle);
    editorBtnShadow.append(editorBtnElem);
    return editorBtn;
  }

  createEditorButtonMeet(compGmailBtn) {
    const gmailStyle = window.getComputedStyle(compGmailBtn);
    const editorBtn = document.createElement('div');
    editorBtn.style.marginRight = '10px';
    editorBtn.tabIndex = 0;
    editorBtn.type = 'button';
    editorBtn.dataset.tooltip = 'Mailvelope Editor';
    editorBtn.style.backgroundColor = gmailStyle.backgroundColor;
    editorBtn.style.borderRadius = '50%';
    editorBtn.style.boxShadow = gmailStyle.boxShadow;
    editorBtn.style.height = '40px';
    editorBtn.style.minWidth = '40px';
    editorBtn.addEventListener('click', this.onEditorButton.bind(this));
    const editorBtnShadow = editorBtn.attachShadow({mode: 'open'});
    const logo = document.createElement('div');
    logo.style.height = '40px';
    logo.style.width = '40px';
    logo.style.backgroundSize = '20px';
    logo.style.backgroundPosition = 'center';
    logo.style.backgroundRepeat = 'no-repeat';
    logo.style.backgroundImage = 'url(data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPHN2ZyB3aWR0aD0iMTZweCIgaGVpZ2h0PSIxNnB4IiB2aWV3Qm94PSIwIDAgMTYgMTYiIHZlcnNpb249IjEuMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayI+CiAgICA8IS0tIEdlbmVyYXRvcjogU2tldGNoIDU2LjIgKDgxNjcyKSAtIGh0dHBzOi8vc2tldGNoLmNvbSAtLT4KICAgIDx0aXRsZT4xNngxNjwvdGl0bGU+CiAgICA8ZGVzYz5DcmVhdGVkIHdpdGggU2tldGNoLjwvZGVzYz4KICAgIDxnIGlkPSIxNngxNiIgc3Ryb2tlPSJub25lIiBzdHJva2Utd2lkdGg9IjEiIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0iZXZlbm9kZCI+CiAgICAgICAgPGNpcmNsZSBpZD0iT3ZhbCIgZmlsbD0iI0ZGRkZGRiIgY3g9IjgiIGN5PSI4IiByPSI4Ij48L2NpcmNsZT4KICAgICAgICA8Y2lyY2xlIGlkPSJDb21iaW5lZC1TaGFwZSIgZmlsbD0iI0ZGMDA0RiIgY3g9IjgiIGN5PSI4IiByPSI4Ij48L2NpcmNsZT4KICAgICAgICA8cGF0aCBkPSJNNy45OTM3NjgyOSwxNC42NTg3ODA1IEM2LjIxMDQ3NTYxLDE0LjY1ODc4MDUgNC41Mzc1ODk0MywxMy45NjkyMjc2IDMuMjgzMTk5MTksMTIuNzE3MTk1MSBDMi4wMjczMDQ4OCwxMS40NjM1NzcyIDEuMzM0Nzg0NTUsOS43ODg5MDI0NCAxLjMzMzMxODgyLDguMDAxNTA0MDcgQzEuMzMyNzUyMDMsNy4zMTU5NzU2MSAxLjQzNjg5ODM3LDYuNjM4NjU4NTQgMS42NDI4NzM5OCw1Ljk4ODI5MjY4IEwxLjY0NTkyMjc2LDUuOTc3MzE3MDcgQzEuNjkyNzkyNjgsNS44MTIyMzU3NyAxLjc1MDE1MDQxLDUuNjUzNjU4NTQgMS44MTY3MzU3Nyw1LjUwNTE2MjYgQzEuODI4ODkwMjQsNS40NzUyODQ1NSAxLjg0MTI4ODYyLDUuNDQ1NTI4NDYgMS44NTM4MDg5NCw1LjQxNTgxMzAxIEMxLjkxNzE0MjI4LDUuMjcwNjA5NzYgMi4xNjYwODUzNyw0Ljc3NjEzODIxIDIuNzUzODkwMjQsNC40MDY3NDc5NyBDMy4yNTcwMjAzMyw0LjA5MDUyODQ2IDMuNzA1NTU2OTEsNC4wNDc1MjAzMyAzLjgwODQ4Mzc0LDQuMDQxNzA3MzIgQzMuOTMxNDkxODcsNC4wMjc2ODI5MyA0LjA1NzUwODEzLDQuMDIwNTI4NDYgNC4xODMxNTg1NCw0LjAyMDUyODQ2IEM0Ljc5ODg0OTU5LDQuMDIwNTI4NDYgNS4zNDQyNTYxLDQuMjY2NDIyNzYgNS43MTg5MzA4OSw0LjcxMjg4NjE4IEM1LjkyODkzMDg5LDQuOTYzMTMwMDggNi4wNjk3NDM5LDUuMjU5MDY1MDQgNi4xMzM0NDMwOSw1LjU4MDI4NDU1IEM2LjM4OTcwMzI1LDUuNDkxMTc4ODYgNi42NTczNDU1Myw1LjQ0NDcxNTQ1IDYuOTIwMTUwNDEsNS40NDQ3MTU0NSBDNy40Nzg5NzE1NCw1LjQ0NDcxNTQ1IDcuOTc5OTA2NSw1LjY0NzI3NjQyIDguMzQ3ODMzMzMsNi4wMTg1MzY1OSBDOC44MDIxODI5Myw1LjY0NzExMzgyIDkuMzUyMzA0ODgsNS40NDQ3MTU0NSA5LjkxNzQyNjgzLDUuNDQ0NzE1NDUgQzEwLjUzMzE1ODUsNS40NDQ3MTU0NSAxMS4wNzg2MDU3LDUuNjkwNjA5NzYgMTEuNDUzMjgwNSw2LjEzNzA3MzE3IEMxMS44MzMxMTc5LDYuNTg5NzU2MSAxMS45ODE5Nzk3LDcuMTgxMDk3NTYgMTEuODcyNDI2OCw3LjgwMjExMzgyIEwxMS41MzIyMjM2LDkuNzMxNTg1MzcgQzExLjQ5OTEzNDEsOS45MTkyMjc2NCAxMS41MzQzMzc0LDEwLjA4NjIxOTUgMTEuNjMxMjQ4LDEwLjIwMTc0OCBDMTEuNzIzMDM2NiwxMC4zMTExNzg5IDExLjg3MDM1MzcsMTAuMzcxNDIyOCAxMi4wNDYwODU0LDEwLjM3MTQyMjggQzEyLjM4NTkyMjgsMTAuMzcxNDIyOCAxMi43Mzk1NDA3LDEwLjI5NzExMzggMTMuMDAwMjMxNyw5LjQwODgyMTE0IEMxMy4xNDEzNjk5LDguOTEwODEzMDEgMTMuMjA2NjEzOCw4LjM5MTEzODIxIDEzLjE5MzcyNzYsNy44NjYwNTY5MSBDMTMuMTYwNTU2OSw2LjUxNDY3NDggMTIuNjA3MTQyMyw1LjI0NDk1OTM1IDExLjYzNTQ3NTYsNC4yOTA3MzE3MSBDMTAuNjYzODQ5NiwzLjMzNjYyNjAyIDkuMzg0MTM0MTUsMi44MDYwOTc1NiA4LjAzMjA2MDk4LDIuNzk2ODY5OTIgTDcuOTk1Mzk0MzEsMi43OTY3NDc5NyBDNi45NjAxMDk3NiwyLjc5Njc0Nzk3IDUuOTU4OTMwODksMy4xMDIyNzY0MiA1LjEwMDc2MDE2LDMuNjgwMjQzOSBDNC45NzgyODA0OSwzLjc2MjY4MjkzIDQuODM1ODQxNDYsMy44MDYyMTk1MSA0LjY4ODg5MDI0LDMuODA2MjE5NTEgQzQuNDc1MjMxNzEsMy44MDYyMTk1MSA0LjI3MzE1ODU0LDMuNzEzMzczOTggNC4xMzQ0MTg3LDMuNTUxNDYzNDEgQzMuOTk4NDgzNzQsMy4zOTI4MDQ4OCAzLjkzNjU3MzE3LDMuMTgzMzMzMzMgMy45NjQ1LDIuOTc2NzQ3OTcgQzMuOTkyNDI2ODMsMi43NzAzMjUyIDQuMTA3Mzg2MTgsMi41ODUyMDMyNSA0LjI3OTg2NTg1LDIuNDY4ODYxNzkgQzUuMzgwOTYzNDEsMS43MjYwMTYyNiA2LjY2NTk2MzQxLDEuMzMzMzMzMzMgNy45OTYwNDQ3MiwxLjMzMzMzMzMzIEM4LjA0MDE5MTA2LDEuMzMzMzMzMzMgOC4wODQ1NDA2NSwxLjMzMzczOTg0IDguMTI4OTMwODksMS4zMzQ2NzQ4IEM5LjgzOTUsMS4zNjgxNzA3MyAxMS40NTU1NTY5LDIuMDUzNjE3ODkgMTIuNjc5MjU2MSwzLjI2NDc5Njc1IEMxMy45MDI5MTQ2LDQuNDc2MDE2MjYgMTQuNjA0OTA2NSw2LjA4NDk1OTM1IDE0LjY1NTc2MDIsNy43OTUyMDMyNSBDMTQuNjcyMzg2Miw4LjM1NTEyMTk1IDE0LjYxOTA5MzUsOC45MTI2ODI5MyAxNC40OTcyNjQyLDkuNDU1NTY5MTEgTDE0LjUwMzg0OTYsOS40NTczNTc3MiBMMTQuNDUxMDQ0Nyw5LjY1NTQ0NzE1IEwxNC40MTc5MTQ2LDkuNzc1Mjg0NTUgQzE0LjQxNTI3MjQsOS43ODQ2MzQxNSAxNC40MDY5Nzk3LDkuODEyMTU0NDcgMTQuNDA2OTc5Nyw5LjgxMjE1NDQ3IEMxNC4zNDg4OTAyLDEwLjAxNzc2NDIgMTQuMjc3OTU1MywxMC4yMjc3MjM2IDE0LjE5NzE0MjMsMTAuNDMyNjQyMyBDMTQuMTUxNTczMiwxMC41NDIwNzMyIDEzLjkwMDc2MDIsMTEuMDg5MzkwMiAxMy4yOTAwNjkxLDExLjQ3MzIxMTQgQzEyLjc4ODY0NjMsMTEuNzg4MjkyNyAxMi4zNzc1ODk0LDExLjgyMTA1NjkgMTIuMjgyODMzMywxMS44MjQzMDg5IEMxMi4yMDMwMzY2LDExLjgzMTMwMDggMTIuMTIzNDQzMSwxMS44MzQ4Mzc0IDEyLjA0NjA4NTQsMTEuODM0ODM3NCBDMTEuNDMwMzk0MywxMS44MzQ4Mzc0IDEwLjg4NDk0NzIsMTEuNTg4OTQzMSAxMC41MTAyMzE3LDExLjE0MjQ3OTcgQzEwLjEzMDM5NDMsMTAuNjg5NzU2MSA5Ljk4MTQ5MTg3LDEwLjA5ODQxNDYgMTAuMDkxMDg1NCw5LjQ3NzQ3OTY3IEwxMC40MzEyODg2LDcuNTQ4MDA4MTMgQzEwLjQ2NDMzNzQsNy4zNjAyODQ1NSAxMC40MjkxNzQ4LDcuMTkzMjkyNjggMTAuMzMyMjIzNiw3LjA3Nzc2NDIzIEMxMC4yNDA0NzU2LDYuOTY4MzczOTggMTAuMDkzMTU4NSw2LjkwODEzMDA4IDkuOTE3NDI2ODMsNi45MDgxMzAwOCBDOS40NDYxNjY2Nyw2LjkwODEzMDA4IDguOTU5MTM0MTUsNy4zMjU4OTQzMSA4Ljg3NTEwOTc2LDcuODAyMTU0NDcgTDguNTAyNTg5NDMsOS44Mjk4Mzc0IEM4LjQ1Nzk1NTI4LDEwLjA3MjY0MjMgOC4yNDY0MTA1NywxMC4yNDg4NjE4IDcuOTk5NTgxMywxMC4yNDg4NjE4IEw3LjU1MTY1NDQ3LDEwLjI0ODg2MTggQzcuMzk5NDE4NywxMC4yNDg4NjE4IDcuMjU2MTY2NjcsMTAuMTgxNzQ4IDcuMTU4Njg2OTksMTAuMDY0NzU2MSBDNy4wNjEyMDczMiw5Ljk0NzY4MjkzIDcuMDIxMTI2MDIsOS43OTQ3MTU0NSA3LjA0ODY0NjM0LDkuNjQ0OTE4NyBMNy40MzQ0MTg3LDcuNTQ1MzI1MiBDNy40NjcwNjA5OCw3LjM1OTgzNzQgNy40MzE3NzY0Miw3LjE5MzIxMTM4IDcuMzM0ODY1ODUsNy4wNzc2ODI5MyBDNy4yNDMxMTc4OSw2Ljk2ODMzMzMzIDcuMDk1ODAwODEsNi45MDgxMzAwOCA2LjkyMDE1MDQxLDYuOTA4MTMwMDggQzYuNDQ4ODkwMjQsNi45MDgxMzAwOCA1Ljk2MTgxNzA3LDcuMzI1ODk0MzEgNS44Nzc3OTI2OCw3LjgwMjE1NDQ3IEw1LjUwNTY3ODg2LDkuODI5NzU2MSBDNS40NjEwODUzNywxMC4wNzI2NDIzIDUuMjQ5NSwxMC4yNDg4NjE4IDUuMDAyNjMwMDgsMTAuMjQ4ODYxOCBMNC41NTQ3MDMyNSwxMC4yNDg4NjE4IEM0LjQwMjQyNjgzLDEwLjI0ODg2MTggNC4yNTkyMTU0NSwxMC4xODE3NDggNC4xNjE3NzY0MiwxMC4wNjQ3MTU0IEM0LjA2NDMzNzQsOS45NDc4ODYxOCA0LjAyNDIxNTQ1LDkuNzk0OTE4NyA0LjA1MTY1NDQ3LDkuNjQ1MDgxMyBMNC40Mzg0ODM3NCw3LjUzNzY0MjI4IEw0LjY5Nzc1MjAzLDYuMTE5MzQ5NTkgQzQuNzMwMjcyMzYsNS45MzUgNC42OTQ4NjU4NSw1Ljc2OTEwNTY5IDQuNTk3OTE0NjMsNS42NTM1NzcyNCBDNC41MDYxMjYwMiw1LjU0NDE4Njk5IDQuMzU4ODA4OTQsNS40ODM5NDMwOSA0LjE4MzE1ODU0LDUuNDgzOTQzMDkgQzMuNjcxOTc5NjcsNS40ODM5NDMwOSAzLjM1NzI2NDIzLDUuNjY3Mjc2NDIgMy4xNjM1MjQzOSw2LjA3ODE3MDczIEMyLjg5Mzg5MDI0LDYuNzU0ODc4MDUgMi43NzE4OTgzNyw3LjQ3MDQ4NzggMi44MDA4ODIxMSw4LjIwNTEyMTk1IEMyLjg1MzA3NzI0LDkuNTI5ODM3NCAzLjQxMzcyNzY0LDEwLjc3NjM0MTUgNC4zNzk0NTkzNSwxMS43MTUwODEzIEM1LjM0NTEwOTc2LDEyLjY1MzY5OTIgNi42MDcyMjM1OCwxMy4xNzkyNjgzIDcuOTMzMzIxMTQsMTMuMTk0OTE4NyBDNy45NTQyOTY3NSwxMy4xOTUyMDMzIDcuOTc0OTQ3MTUsMTMuMTk1MzI1MiA3Ljk5NTY3ODg2LDEzLjE5NTMyNTIgQzkuMDkyOTE0NjMsMTMuMTk1MzI1MiAxMC4xNDI1NDg4LDEyLjg1NjEzODIgMTEuMDMxNTMyNSwxMi4yMTQ0NzE1IEMxMS4xNTU0NzU2LDEyLjEyNSAxMS4zMDIwNjEsMTIuMDc3NjgyOSAxMS40NTUzNTM3LDEyLjA3NzY4MjkgQzExLjY1NDAxMjIsMTIuMDc3NjgyOSAxMS44NDY4MTcxLDEyLjE2MDA0MDcgMTEuOTg0Mzc4LDEyLjMwMzYxNzkgQzEyLjEzMDkyMjgsMTIuNDU2NTA0MSAxMi4yMDQwMTIyLDEyLjY2NTI4NDYgMTIuMTg0Nzg0NiwxMi44NzYzMDA4IEMxMi4xNjU1OTc2LDEzLjA4NzA3MzIgMTIuMDU2MjA3MywxMy4yNzg5NDMxIDExLjg4NDU4MTMsMTMuNDAyNzIzNiBDMTAuNzc3NzUyLDE0LjIwMTE3ODkgOS40NzE4MTcwNywxNC42MzUyMDMzIDguMTA4MDM2NTksMTQuNjU3ODQ1NSBDOC4wNjk3MDMyNSwxNC42NTg0NTUzIDguMDMxODU3NzIsMTQuNjU4NzgwNSA3Ljk5Mzc2ODI5LDE0LjY1ODc4MDUiIGlkPSJGaWxsLTEiIGZpbGw9IiNGRkZGRkYiPjwvcGF0aD4KICAgIDwvZz4KPC9zdmc+)';
    editorBtnShadow.append(logo);
    return editorBtn;
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
          const bodyElem = containerElem.querySelector(MSG_BODY_SELECTOR);
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
      const msgText = msgElem.querySelector(MSG_BODY_SELECTOR).innerText;
      return /BEGIN\sPGP\sMESSAGE/.test(msgText);
    }
    return false;
  }

  getClearText(msgElem) {
    const {innerText} = msgElem.querySelectorAll('.ii.gt')[0];
    return /\S/.test(innerText) ? innerText : '';
  }

  getEncryptedAttachments(msgElem) {
    const attachmentElems = msgElem.querySelectorAll('.aV3');
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
      msgData.menuMouseDownHandler = () => {
        this.menuPopover = document.querySelector('.b7.J-M[role="menu"]');
        setTimeout(() => {
          this.addMenuBtn('reply', this.menuPopover, null, ev => this.onSecureButton(ev, 'reply', msgId));
          const replyMenuItem = this.menuPopover.querySelector('[role="menuitem"][id="r2"]');
          if (replyMenuItem.style.display !== 'none') {
            this.addMenuBtn('replyAll', this.menuPopover, replyMenuItem, ev => this.onSecureButton(ev, 'reply', msgId, true));
          }
          this.addMenuBtn('forward', this.menuPopover, this.menuPopover.querySelector('[role="menuitem"][id="r3"]'), ev => this.onSecureButton(ev, 'forward', msgId));
        }, !this.menuPopover.hasChildNodes() ? 50 : 0);
      };
      menuBtn.addEventListener('mousedown', msgData.menuMouseDownHandler, {capture: true});
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
          const bodyElem = msgElem.querySelector(MSG_BODY_SELECTOR);
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

  removeEditorButton() {
    if (this.editorBtn) {
      this.editorBtn.parentNode && this.editorBtn.parentNode.removeChild(this.editorBtn);
      this.editorBtnRoot.removeAttribute('data-mvelo-frame');
      this.editorBtnRoot.style.overflow = 'inherit';
    }
  }

  onEditorButton(ev) {
    this.editorBtn.blur();
    this.port.emit('open-editor', {userInfo: this.getUserInfo()});
    ev.stopPropagation();
  }

  onSecureButton(ev, type, msgId, all = false) {
    this.port.emit('secure-button', {type, msgId, all, userInfo: this.getUserInfo()});
    ev.stopPropagation();
  }
}
